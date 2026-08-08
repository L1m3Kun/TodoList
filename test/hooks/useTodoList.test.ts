import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTodoList } from '@/hooks/useTodoList';
import { HttpError } from '@/lib/api/errors';
import {
  TEST_API_BASE_URL,
  errorBody,
  errorHandler,
  mockTodoDetail,
  mockTodoSummary,
} from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';
import type { TodoSummaryDto } from '@/types/todo.dto';

/** GET /items 호출 횟수를 세는 핸들러로 happy-path를 덮어쓴다(effect 재요청 회귀 검증용). */
function countListCalls(respondWith: () => TodoSummaryDto[]): { count: () => number } {
  let calls = 0;
  server.use(
    http.get(`${TEST_API_BASE_URL}/items`, () => {
      calls += 1;
      return HttpResponse.json(respondWith());
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

  it('createTodo 성공 시 생성된 항목을 반환하고 refetch로 목록을 재동기화한다 (H-2/M-2)', async () => {
    const createdDetail = { ...mockTodoDetail, id: 2, name: 'New todo' };
    const createdSummary = { id: 2, name: 'New todo', isCompleted: false };
    let listCallCount = 0;
    server.use(
      http.post(`${TEST_API_BASE_URL}/items`, () => HttpResponse.json(createdDetail)),
      http.get(`${TEST_API_BASE_URL}/items`, () => {
        listCallCount += 1;
        // 두 번째 이후 호출(=refetch)부터는 새 항목이 포함된 목록을 돌려준다
        return HttpResponse.json(listCallCount === 1 ? [mockTodoSummary] : [mockTodoSummary, createdSummary]);
      }),
    );

    const { result } = renderHook(() => useTodoList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(listCallCount).toBe(1);

    let created: TodoSummaryDto | null = null;
    await act(async () => {
      created = await result.current.createTodo({ name: 'New todo' });
    });

    expect(created).toEqual(createdSummary);
    // refetch가 실제로 새 GET 요청을 발생시켰는지(로컬 append가 아니라 서버 재동기화인지) 확인
    await waitFor(() => expect(listCallCount).toBe(2));
    await waitFor(() => expect(result.current.items).toEqual([mockTodoSummary, createdSummary]));
    expect(result.current.error).toBeNull();
  });

  it('deleteTodo 성공 시 true를 반환하고 refetch로 목록을 재동기화한다 (H-2/M-2)', async () => {
    let listCallCount = 0;
    server.use(
      http.get(`${TEST_API_BASE_URL}/items`, () => {
        listCallCount += 1;
        return HttpResponse.json(listCallCount === 1 ? [mockTodoSummary] : []);
      }),
    );

    const { result } = renderHook(() => useTodoList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual([mockTodoSummary]);

    let deleted: boolean | null = null;
    await act(async () => {
      deleted = await result.current.deleteTodo(mockTodoSummary.id);
    });

    expect(deleted).toBe(true);
    await waitFor(() => expect(listCallCount).toBe(2));
    await waitFor(() => expect(result.current.items).toEqual([]));
    expect(result.current.error).toBeNull();
  });

  it('createTodo 실패 시 null을 반환하고 error에 반영되며 목록에 반영되지 않는다 (H-2 — throw하지 않음)', async () => {
    const list = countListCalls(() => [mockTodoSummary]);
    server.use(
      errorHandler('post', `${TEST_API_BASE_URL}/items`, 400, errorBody('Validation Failed')),
    );

    const { result } = renderHook(() => useTodoList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created: TodoSummaryDto | null = mockTodoSummary;
    await act(async () => {
      created = await result.current.createTodo({ name: 'Duplicate' });
    });

    expect(created).toBeNull();
    expect(result.current.error).toBeInstanceOf(HttpError);
    // 실패한 생성은 refetch를 트리거하지 않는다 — 목록은 최초 로드 그대로다
    expect(list.count()).toBe(1);
    expect(result.current.items).toEqual([mockTodoSummary]);
  });

  it('deleteTodo 실패(500) 시 false를 반환하고 error에 반영되며 항목이 그대로 남는다 (M-4a — 500 실패 경로)', async () => {
    // D-53 실측: 없는 항목 DELETE는 404가 아니라 500 + 원시 서버 메시지다.
    const list = countListCalls(() => [mockTodoSummary]);
    server.use(
      errorHandler(
        'delete',
        `${TEST_API_BASE_URL}/items/:itemId`,
        500,
        errorBody("\nInvalid `prisma.item.delete()` invocation:\n... Record to delete does not exist."),
      ),
    );

    const { result } = renderHook(() => useTodoList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let deleted: boolean | null = null;
    await act(async () => {
      deleted = await result.current.deleteTodo(mockTodoSummary.id);
    });

    expect(deleted).toBe(false);
    expect(result.current.error).toBeInstanceOf(HttpError);
    expect((result.current.error as HttpError).status).toBe(500);
    // 원시 서버 메시지가 사용자 표시 문구로 새지 않는다 (M-1과 같은 원칙)
    expect(result.current.error?.message.toLowerCase()).not.toContain('prisma');
    // 실패한 삭제는 refetch를 트리거하지 않는다 — 항목이 그대로 남는다
    expect(list.count()).toBe(1);
    expect(result.current.items).toEqual([mockTodoSummary]);
  });

  it('effect 재요청 회귀 — params를 인라인 객체로 넘겨 리렌더해도 값이 같으면 요청이 중복되지 않는다', async () => {
    const list = countListCalls(() => [mockTodoSummary]);
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
    const list = countListCalls(() => [mockTodoSummary]);
    const { result } = renderHook(() => useTodoList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(list.count()).toBe(1);

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(list.count()).toBe(2));
  });

  it('언마운트 후 늦게 도착하는 초기 로드 응답은 상태를 갱신하지 않는다 (stale/unmount 가드, M-4b)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let markHandlerReached!: () => void;
    const handlerReached = new Promise<void>((resolve) => {
      markHandlerReached = resolve;
    });
    let resolveList!: (items: TodoSummaryDto[]) => void;
    const listResponse = new Promise<TodoSummaryDto[]>((resolve) => {
      resolveList = resolve;
    });
    server.use(
      http.get(`${TEST_API_BASE_URL}/items`, async () => {
        markHandlerReached();
        return HttpResponse.json(await listResponse);
      }),
    );

    const { unmount } = renderHook(() => useTodoList());
    // 요청이 실제로 핸들러에 도달한(=in-flight) 뒤에 언마운트해야 이 테스트가 의미가 있다.
    await handlerReached;
    unmount();

    await act(async () => {
      resolveList([mockTodoSummary]);
      await Promise.resolve();
    });

    // React가 "언마운트된 컴포넌트에 대한 상태 업데이트" 경고를 내지 않아야
    // isMountedRef/isStale 가드가 실제로 setState를 막았다고 볼 수 있다.
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('id 대신 page가 즉시 바뀌면 이전 요청의 응답이 늦게 도착해도 최신 목록을 덮어쓰지 않는다 (stale 가드, M-4b)', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/items`, async ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get('page');
        if (page === '1') {
          // 첫 페이지 요청을 의도적으로 지연시켜 두 번째 요청보다 늦게 응답하게 한다
          await new Promise((resolve) => setTimeout(resolve, 30));
          return HttpResponse.json([mockTodoSummary]);
        }
        return HttpResponse.json([{ ...mockTodoSummary, id: 99, name: 'page2' }]);
      }),
    );

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => useTodoList({ page }),
      { initialProps: { page: 1 } },
    );

    rerender({ page: 2 });

    await waitFor(() =>
      expect(result.current.items).toEqual([{ ...mockTodoSummary, id: 99, name: 'page2' }]),
    );

    // 지연됐던 page=1 응답이 뒤늦게 도착해도 최신(page=2) 상태를 덮어쓰지 않는다
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.items).toEqual([{ ...mockTodoSummary, id: 99, name: 'page2' }]);
  });
});
