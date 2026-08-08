import { useCallback, useEffect, useState } from 'react';
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
 *
 * `createTodo`/`deleteTodo`는 throw하지 않는다(D-61 — `useTodoDetail`·`useImageUpload`와
 * 동일 계약: 에러는 `error` state로, 성공 여부는 반환값으로 알린다). 실패 시 `null`을
 * 반환하고 `error`를 채운다. 성공 후에는 로컬 배열을 직접 append/filter하지 않고
 * `refetch()`로 서버를 다시 조회해 재동기화한다(M-2) — 목록 effect의 in-flight 요청과
 * 뮤테이션이 경쟁하면 로컬 반영은 뒤늦게 도착한 목록 응답에 덮어써질 수 있기 때문이다.
 * 서버가 정본이라는 원칙은 `useTodoDetail.update`가 이미 채택한 것과 일관된다.
 *
 * `createTodo`/`deleteTodo`는 언마운트 여부를 검사하지 않는다 — React 18부터 언마운트된
 * 컴포넌트에 대한 setState는 경고 없는 무해한 no-op이라 마운트 추적 ref가 방지할 문제가
 * 없다(오히려 StrictMode의 mount→unmount→remount 시퀀스에서 cleanup만 있고 remount 시
 * 되돌리는 로직이 없는 ref는 "영구히 false"로 고착되어 뮤테이션이 항상 실패한 것처럼
 * 보고하는 실버그를 만들었다 — 이 주석을 남긴 이유).
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
  createTodo: (input: CreateTodoInput) => Promise<TodoSummaryDto | null>;
  deleteTodo: (id: number) => Promise<boolean>;
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

  const createTodo = useCallback(
    async (input: CreateTodoInput): Promise<TodoSummaryDto | null> => {
      try {
        const created = await createTodoRequest(input);
        setState((curr) => ({ ...curr, error: null }));
        refetch();
        return toSummary(created);
      } catch (caught) {
        const apiError = toApiError(caught);
        setState((curr) => ({ ...curr, error: apiError }));
        return null;
      }
    },
    [refetch]
  );

  const deleteTodo = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await deleteTodoRequest(id);
        setState((curr) => ({ ...curr, error: null }));
        refetch();
        return true;
      } catch (caught) {
        const apiError = toApiError(caught);
        setState((curr) => ({ ...curr, error: apiError }));
        return false;
      }
    },
    [refetch]
  );

  return { ...state, refetch, createTodo, deleteTodo };
}
