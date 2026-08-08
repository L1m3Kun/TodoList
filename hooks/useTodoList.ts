import { useCallback, useEffect, useRef, useState } from 'react';
import { createTodo as createTodoRequest, deleteTodo as deleteTodoRequest, getTodos } from '@/lib/api/todoApi';
import { ApiError, NetworkError } from '@/lib/api/errors';
import type { CreateTodoInput, TodoSummaryDto } from '@/types/todo.dto';

/**
 * Todo 목록 데이터 접근 훅. mount 시(및 page/pageSize 변경 시) `getTodos`를 effect로
 * 호출한다 — 파생 데이터 fetch이므로 effect가 정당한 경우다(code-conventions.md 예외).
 *
 * effect 의존성은 `params` 객체가 아니라 `page`/`pageSize` primitive로 좁혔다. 호출부가
 * 매 렌더 인라인 객체(`{ page: 1 }`)를 넘겨도 값 자체가 바뀌지 않으면 재요청하지 않는다
 * (객체 identity를 deps에 넣으면 렌더마다 재요청이 나가는 함정을 피한다).
 */

export interface UseTodoListParams {
  page?: number;
  pageSize?: number;
}

interface UseTodoListState {
  items: TodoSummaryDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export interface UseTodoListResult extends UseTodoListState {
  refetch: () => void;
  createTodo: (input: CreateTodoInput) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
}

/**
 * todoApi(ST-4)는 계약상 NetworkError|HttpError|ValidationError 3종만 던지지만,
 * `getApiBaseUrl()`의 배포 설정 오류(plain Error)가 예외적으로 그대로 전파될 수 있다(ST-4 계약).
 * 이 훅의 `error` 필드 타입을 `ApiError`로 유지하기 위해 그 경우도 NetworkError로 감싼다.
 */
function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new NetworkError(error);
}

function toSummary(detail: { id: number; name: string; isCompleted: boolean }): TodoSummaryDto {
  return { id: detail.id, name: detail.name, isCompleted: detail.isCompleted };
}

export function useTodoList(params?: UseTodoListParams): UseTodoListResult {
  const { page, pageSize } = params ?? {};
  const [state, setState] = useState<UseTodoListState>({
    items: [],
    isLoading: true,
    error: null,
  });
  const [refetchToken, setRefetchToken] = useState(0);
  // 인터랙션 함수(createTodo/deleteTodo)는 effect가 아니라서 자체 cleanup이 없다.
  // 언마운트 후 도착하는 응답이 setState하지 않도록 이 ref로 마운트 여부를 추적한다.
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // effect가 재실행될 때(마운트 해제 포함)마다 cleanup에서 isStale을 세워
    // 이전 실행에서 나간 요청의 응답을 무시한다(stale-response 가드).
    let isStale = false;

    async function fetchList() {
      setState((curr) => ({ ...curr, isLoading: true, error: null }));
      try {
        const items = await getTodos({ page, pageSize });
        if (isStale) return;
        setState({ items, isLoading: false, error: null });
      } catch (error) {
        if (isStale) return;
        setState((curr) => ({ ...curr, isLoading: false, error: toApiError(error) }));
      }
    }

    void fetchList();

    return () => {
      isStale = true;
    };
  }, [page, pageSize, refetchToken]);

  const refetch = useCallback(() => {
    setRefetchToken((token) => token + 1);
  }, []);

  const createTodo = useCallback(async (input: CreateTodoInput) => {
    try {
      const created = await createTodoRequest(input);
      if (!isMountedRef.current) return;
      setState((curr) => ({ ...curr, items: [...curr.items, toSummary(created)], error: null }));
    } catch (caught) {
      const apiError = toApiError(caught);
      if (isMountedRef.current) {
        setState((curr) => ({ ...curr, error: apiError }));
      }
      throw apiError;
    }
  }, []);

  const deleteTodo = useCallback(async (id: number) => {
    try {
      await deleteTodoRequest(id);
      if (!isMountedRef.current) return;
      setState((curr) => ({
        ...curr,
        items: curr.items.filter((item) => item.id !== id),
        error: null,
      }));
    } catch (caught) {
      const apiError = toApiError(caught);
      if (isMountedRef.current) {
        setState((curr) => ({ ...curr, error: apiError }));
      }
      throw apiError;
    }
  }, []);

  return { ...state, refetch, createTodo, deleteTodo };
}
