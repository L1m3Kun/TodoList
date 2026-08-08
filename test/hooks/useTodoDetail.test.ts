import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

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

  it('update() 후 detail이 서버 응답으로 교체된다(optimistic 아님)', async () => {
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

    await act(async () => {
      await result.current.update({ name: 'Updated name', isCompleted: true });
    });

    expect(result.current.detail).toEqual(updatedDetail);
    expect(result.current.error).toBeNull();
  });

  it('update() 실패 시 detail은 이전 값 그대로 유지되고 error가 반영되며 예외가 다시 던져진다', async () => {
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

    await act(async () => {
      await expect(result.current.update({ name: '' })).rejects.toBeInstanceOf(
        HttpError
      );
    });

    expect(result.current.detail).toEqual(mockTodoDetail);
    expect(result.current.error).toBeInstanceOf(HttpError);
  });

  it('remove() 후 detail이 null이 되고 DeleteResult를 반환한다', async () => {
    const { result } = renderHook(() => useTodoDetail(mockTodoDetail.id));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let deleteResult: { message: string } | undefined;
    await act(async () => {
      deleteResult = await result.current.remove();
    });

    expect(deleteResult).toEqual(mockDeleteResult);
    expect(result.current.detail).toBeNull();
    expect(result.current.error).toBeNull();
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
});
