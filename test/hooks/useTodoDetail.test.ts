import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTodoDetail } from '@hooks/useTodoDetail';
import { HttpError } from '@lib/api';
import {
  TEST_API_BASE_URL,
  errorBody,
  errorHandler,
  mockDeleteResult,
  mockTodoDetail,
} from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';
import type { DeleteResult, TodoDetailDto } from '@/types/todo.dto';

describe('useTodoDetail', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('상세를 정상 로드한다 — detail이 채워지고 isLoading이 true에서 false로 전이한다', async () => {
    const { result } = renderHook(() => useTodoDetail(mockTodoDetail.id));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.detail).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.detail).toEqual(mockTodoDetail);
    expect(result.current.error).toBeNull();
  });

  it('에러 응답 시 error에 HttpError가 반영되고 detail은 null로 유지된다', async () => {
    server.use(
      errorHandler(
        'get',
        `${TEST_API_BASE_URL}/items/:itemId`,
        404,
        errorBody('Item with ID 999999 not found for tenant limekun')
      )
    );

    const { result } = renderHook(() => useTodoDetail(999999));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.detail).toBeNull();
    expect(result.current.error).toBeInstanceOf(HttpError);
    expect((result.current.error as HttpError).status).toBe(404);
  });

  it('update() 성공 시 서버 응답을 반환하고 detail이 그 응답으로 교체된다(optimistic 아님)', async () => {
    const updatedDetail = {
      ...mockTodoDetail,
      name: 'Updated name',
      isCompleted: true,
    };
    server.use(
      http.patch(`${TEST_API_BASE_URL}/items/:itemId`, () =>
        HttpResponse.json(updatedDetail)
      )
    );

    const { result } = renderHook(() => useTodoDetail(mockTodoDetail.id));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.detail).toEqual(mockTodoDetail);

    let updated: TodoDetailDto | null = null;
    await act(async () => {
      updated = await result.current.update({ name: 'Updated name', isCompleted: true });
    });

    expect(updated).toEqual(updatedDetail);
    expect(result.current.detail).toEqual(updatedDetail);
    expect(result.current.error).toBeNull();
  });

  it('update() 실패 시 null을 반환하고 detail은 이전 값 그대로 유지되며 error가 반영된다 (H-2 — throw하지 않음)', async () => {
    server.use(
      errorHandler(
        'patch',
        `${TEST_API_BASE_URL}/items/:itemId`,
        400,
        errorBody('Validation Failed')
      )
    );

    const { result } = renderHook(() => useTodoDetail(mockTodoDetail.id));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let updated: TodoDetailDto | null = mockTodoDetail;
    await act(async () => {
      updated = await result.current.update({ name: '' });
    });

    expect(updated).toBeNull();
    expect(result.current.detail).toEqual(mockTodoDetail);
    expect(result.current.error).toBeInstanceOf(HttpError);
  });

  it('remove() 성공 시 detail이 null이 되고 DeleteResult를 반환한다', async () => {
    const { result } = renderHook(() => useTodoDetail(mockTodoDetail.id));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let deleteResult: DeleteResult | null = null;
    await act(async () => {
      deleteResult = await result.current.remove();
    });

    expect(deleteResult).toEqual(mockDeleteResult);
    expect(result.current.detail).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('remove() 실패(500) 시 null을 반환하고 detail이 유지되며 error가 반영된다 (M-4a — 500 실패 경로)', async () => {
    // D-53 실측: 없는 항목 DELETE는 404가 아니라 500 + 원시 서버 메시지다.
    server.use(
      errorHandler(
        'delete',
        `${TEST_API_BASE_URL}/items/:itemId`,
        500,
        errorBody("\nInvalid `prisma.item.delete()` invocation:\n... Record to delete does not exist.")
      )
    );

    const { result } = renderHook(() => useTodoDetail(mockTodoDetail.id));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let deleteResult: DeleteResult | null = mockDeleteResult;
    await act(async () => {
      deleteResult = await result.current.remove();
    });

    expect(deleteResult).toBeNull();
    expect(result.current.detail).toEqual(mockTodoDetail);
    expect(result.current.error).toBeInstanceOf(HttpError);
    expect((result.current.error as HttpError).status).toBe(500);
    expect(result.current.error?.message.toLowerCase()).not.toContain('prisma');
  });

  it('id가 바뀌면 새 id로 다시 로드한다', async () => {
    const otherDetail = { ...mockTodoDetail, id: 2, name: 'Other todo' };
    server.use(
      http.get(`${TEST_API_BASE_URL}/items/:itemId`, ({ params }) => {
        return HttpResponse.json(
          params.itemId === '2' ? otherDetail : mockTodoDetail
        );
      })
    );

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useTodoDetail(id),
      {
        initialProps: { id: mockTodoDetail.id },
      }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.detail).toEqual(mockTodoDetail);

    rerender({ id: 2 });

    await waitFor(() => expect(result.current.detail).toEqual(otherDetail));
  });

  it('id 변경 시 이전 id의 지연 응답이 늦게 도착해도 최신 id의 상태를 덮어쓰지 않는다 (stale 가드, M-4b)', async () => {
    const otherDetail = { ...mockTodoDetail, id: 2, name: 'Other todo' };
    server.use(
      http.get(`${TEST_API_BASE_URL}/items/:itemId`, async ({ params }) => {
        if (params.itemId === String(mockTodoDetail.id)) {
          // 이전 id(1)의 응답을 의도적으로 지연시켜 새 id(2)보다 늦게 도착하게 한다
          await new Promise((resolve) => setTimeout(resolve, 30));
          return HttpResponse.json(mockTodoDetail);
        }
        return HttpResponse.json(otherDetail);
      })
    );

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useTodoDetail(id),
      { initialProps: { id: mockTodoDetail.id } }
    );

    rerender({ id: 2 });

    await waitFor(() => expect(result.current.detail).toEqual(otherDetail));

    // 지연됐던 이전 id 응답이 뒤늦게 도착해도 최신(id=2) 상태를 덮어쓰지 않는다
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.detail).toEqual(otherDetail);
  });

  it('언마운트 후 늦게 도착하는 응답은 상태를 갱신하지 않는다 (stale/unmount 가드, M-4b)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let markHandlerReached!: () => void;
    const handlerReached = new Promise<void>((resolve) => {
      markHandlerReached = resolve;
    });
    let resolveDetail!: (detail: TodoDetailDto) => void;
    const detailResponse = new Promise<TodoDetailDto>((resolve) => {
      resolveDetail = resolve;
    });
    server.use(
      http.get(`${TEST_API_BASE_URL}/items/:itemId`, async () => {
        markHandlerReached();
        return HttpResponse.json(await detailResponse);
      })
    );

    const { unmount } = renderHook(() => useTodoDetail(mockTodoDetail.id));
    // 요청이 실제로 핸들러에 도달한(=in-flight) 뒤에 언마운트해야 이 테스트가 의미가 있다.
    await handlerReached;
    unmount();

    await act(async () => {
      resolveDetail(mockTodoDetail);
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
