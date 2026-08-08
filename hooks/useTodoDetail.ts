import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteTodo as deleteTodoRequest,
  getTodo,
  updateTodo as updateTodoRequest,
  ApiError,
  NetworkError,
} from '@/lib/api';
import type { DeleteResult, TodoDetail, UpdateTodoInput } from '@/types/todo';

/**
 * Todo 상세 데이터 접근 훅. mount 시(및 id 변경 시) `getTodo`를 effect로 호출한다.
 *
 * `update()`는 optimistic하지 않다 — 로컬 상태를 먼저 바꾸지 않고, 성공 응답(서버가 정본)을
 * 그대로 받아 로컬 상태를 교체한다. id는 호출부가 이미 `parseTodoId`(lib/utils/parseTodoId.ts)를
 * 거친 number여야 한다(ST-4 계약과 동일한 전제).
 */

interface UseTodoDetailState {
  detail: TodoDetail | null;
  isLoading: boolean;
  error: ApiError | null;
}

export interface UseTodoDetailResult extends UseTodoDetailState {
  update: (patch: UpdateTodoInput) => Promise<void>;
  remove: () => Promise<DeleteResult>;
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
  // update/remove는 effect가 아니라서 자체 cleanup이 없다 — 언마운트 후 도착하는
  // 응답이 setState하지 않도록 이 ref로 마운트 여부를 추적한다.
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    async (patch: UpdateTodoInput) => {
      try {
        const updated = await updateTodoRequest(id, patch);
        if (!isMountedRef.current) return;
        setState((curr) => ({ ...curr, detail: updated, error: null }));
      } catch (caught) {
        const apiError = toApiError(caught);
        if (isMountedRef.current) {
          setState((curr) => ({ ...curr, error: apiError }));
        }
        throw apiError;
      }
    },
    [id]
  );

  const remove = useCallback(async () => {
    try {
      const result = await deleteTodoRequest(id);
      if (isMountedRef.current) {
        setState((curr) => ({ ...curr, detail: null, error: null }));
      }
      return result;
    } catch (caught) {
      const apiError = toApiError(caught);
      if (isMountedRef.current) {
        setState((curr) => ({ ...curr, error: apiError }));
      }
      throw apiError;
    }
  }, [id]);

  return { ...state, update, remove };
}
