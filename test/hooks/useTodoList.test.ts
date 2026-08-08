import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { useTodoList } from '@/hooks/useTodoList';
import { HttpError } from '@/lib/api/errors';
import {
  TEST_API_BASE_URL,
  errorBody,
  errorHandler,
  mockDeleteResult,
  mockTodoDetail,
  mockTodoSummary,
} from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

/** GET /items 호출 횟수를 세는 핸들러로 happy-path를 덮어쓴다(effect 재요청 회귀 검증용). */
function countListCalls(): { count: () => number } {
  let calls = 0;
  server.use(
    http.get(`${TEST_API_BASE_URL}/items`, () => {
      calls += 1;
      return HttpResponse.json([mockTodoSummary]);
    }),
  );
  return { count: () => calls };
}

describe('useTodoList', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('목록을 정상 로드한다 — items가 채워지고 isLoading이 true에서 false로 전이한다', async () => {
    const { result } = renderHook(() => useTodoList());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([mockTodoSummary]);
    expect(result.current.error).toBeNull();
  });

  it('에러 응답 시 error에 HttpError가 반영된다', async () => {
    server.use(
      errorHandler('get', `${TEST_API_BASE_URL}/items`, 500, errorBody('Internal error')),
    );

    const { result } = renderHook(() => useTodoList());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeInstanceOf(HttpError);
    expect((result.current.error as HttpError).status).toBe(500);
  });

  it('createTodo 호출 후 목록이 갱신된다', async () => {
    const createdDetail = { ...mockTodoDetail, id: 2, name: 'New todo' };
    server.use(
      http.post(`${TEST_API_BASE_URL}/items`, () => HttpResponse.json(createdDetail)),
    );

    const { result } = renderHook(() => useTodoList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createTodo({ name: 'New todo' });
    });

    expect(result.current.items).toEqual([
      mockTodoSummary,
      { id: 2, name: 'New todo', isCompleted: false },
    ]);
    expect(result.current.error).toBeNull();
  });

  it('deleteTodo 호출 후 목록에서 항목이 제거된다', async () => {
    const { result } = renderHook(() => useTodoList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual([mockTodoSummary]);

    await act(async () => {
      await result.current.deleteTodo(mockTodoSummary.id);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('createTodo 실패 시 error에 반영되고 예외가 다시 던져진다', async () => {
    server.use(
      errorHandler('post', `${TEST_API_BASE_URL}/items`, 400, errorBody('Validation Failed')),
    );

    const { result } = renderHook(() => useTodoList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.createTodo({ name: 'Duplicate' })).rejects.toBeInstanceOf(
        HttpError,
      );
    });

    expect(result.current.error).toBeInstanceOf(HttpError);
    // 실패한 생성은 목록에 반영되지 않는다
    expect(result.current.items).toEqual([mockTodoSummary]);
  });

  it('deleteTodo 성공 시 응답(message)과 무관하게 항목만 제거한다', async () => {
    server.use(
      http.delete(`${TEST_API_BASE_URL}/items/:itemId`, () => HttpResponse.json(mockDeleteResult)),
    );
    const { result } = renderHook(() => useTodoList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteTodo(mockTodoSummary.id);
    });

    expect(result.current.items).toEqual([]);
  });

  it('effect 재요청 회귀 — params를 인라인 객체로 넘겨 리렌더해도 값이 같으면 요청이 중복되지 않는다', async () => {
    const list = countListCalls();
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => useTodoList({ page }),
      { initialProps: { page: 1 } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(list.count()).toBe(1);

    // 매번 새 객체를 넘기지만 값(page)은 동일 — deps가 primitive이므로 재요청이 없어야 한다
    rerender({ page: 1 });
    rerender({ page: 1 });
    await waitFor(() => expect(list.count()).toBe(1));

    // 대조군: page 값이 실제로 바뀌면 재요청이 발생해야 한다
    rerender({ page: 2 });
    await waitFor(() => expect(list.count()).toBe(2));
  });

  it('refetch() 호출 시 목록을 다시 불러온다', async () => {
    const list = countListCalls();
    const { result } = renderHook(() => useTodoList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(list.count()).toBe(1);

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(list.count()).toBe(2));
  });
});
