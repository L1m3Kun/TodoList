import { useCallback, useEffect, useState } from 'react';
import {
  deleteTodo as deleteTodoRequest,
  getTodo,
  updateTodo as updateTodoRequest,
  ApiError,
  NetworkError,
} from '@/lib/api';
import type { DeleteResult, TodoDetailDto, UpdateTodoInput } from '@/types/todo.dto';

/**
 * Todo 상세 데이터 접근 훅. mount 시(및 id 변경 시) `getTodo`를 effect로 호출한다.
 *
 * `update()`는 optimistic하지 않다 — 로컬 상태를 먼저 바꾸지 않고, 성공 응답(서버가 정본)을
 * 그대로 받아 로컬 상태를 교체한다. id는 호출부가 이미 `parseTodoId`(lib/utils/parseTodoId.ts)를
 * 거친 number여야 한다(ST-4 계약과 동일한 전제).
 *
 * `update`/`remove`는 throw하지 않는다(D-61 — `useTodoList`·`useImageUpload`와 동일 계약:
 * 에러는 `error` state로, 성공 여부는 반환값으로 알린다). 실패 시 `null`을 반환하고,
 * 성공 시에는(언마운트 여부와 무관하게) 항상 서버 응답값을 반환한다.
 *
 * 언마운트 여부는 검사하지 않는다 — React 18부터 언마운트된 컴포넌트에 대한 setState는
 * 경고 없는 무해한 no-op이라 마운트 추적 ref가 막을 문제가 없다.
 */

interface UseTodoDetailState {
  detail: TodoDetailDto | null;
  isLoading: boolean;
  error: ApiError | null;
}

export interface UseTodoDetailResult extends UseTodoDetailState {
  update: (patch: UpdateTodoInput) => Promise<TodoDetailDto | null>;
  remove: () => Promise<DeleteResult | null>;
}

/** getApiBaseUrl()의 배포 설정 오류(plain Error)까지 포함해 항상 ApiError로 정규화한다. */
function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new NetworkError(error);
}

export function useTodoDetail(id: number): UseTodoDetailResult {
  const [state, setState] = useState<UseTodoDetailState>({
    detail: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // effect 재실행(id 변경, 마운트 해제 포함) 시 cleanup에서 이전 요청의 응답을 무시한다.
    let isStale = false;

    async function fetchDetail() {
      setState({ detail: null, isLoading: true, error: null });
      try {
        const detail = await getTodo(id);
        if (isStale) return;
        setState({ detail, isLoading: false, error: null });
      } catch (error) {
        if (isStale) return;
        setState({ detail: null, isLoading: false, error: toApiError(error) });
      }
    }

    void fetchDetail();

    return () => {
      isStale = true;
    };
  }, [id]);

  const update = useCallback(
    async (patch: UpdateTodoInput): Promise<TodoDetailDto | null> => {
      try {
        const updated = await updateTodoRequest(id, patch);
        setState((curr) => ({ ...curr, detail: updated, error: null }));
        return updated;
      } catch (caught) {
        const apiError = toApiError(caught);
        setState((curr) => ({ ...curr, error: apiError }));
        return null;
      }
    },
    [id]
  );

  const remove = useCallback(async (): Promise<DeleteResult | null> => {
    try {
      const result = await deleteTodoRequest(id);
      setState((curr) => ({ ...curr, detail: null, error: null }));
      return result;
    } catch (caught) {
      const apiError = toApiError(caught);
      setState((curr) => ({ ...curr, error: apiError }));
      return null;
    }
  }, [id]);

  return { ...state, update, remove };
}
