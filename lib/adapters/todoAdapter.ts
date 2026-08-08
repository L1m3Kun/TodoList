import type { Todo, TodoDetail } from '@/types/todo';
import type { TodoDetailDto, TodoSummaryDto, UpdateTodoInput } from '@/types/todo.dto';

/**
 * 서버 DTO 어휘(`name`/`isCompleted`)를 화면 도메인 어휘(`todo`/`isFinish`)로 잇는
 * 유일한 지점(S-1/AD-1). 훅·lib/api는 DTO만 다루고, 컴포넌트·페이지는 이 모듈을 거쳐
 * 화면 타입을 받는다. 전부 순수 함수이며 부수효과가 없다.
 */

/** GET /items 목록 응답 1건 → 화면 `Todo`. */
export function toTodo(dto: TodoSummaryDto): Todo {
  return {
    id: dto.id,
    todo: dto.name,
    isFinish: dto.isCompleted,
  };
}

/**
 * 상세 응답 → 화면 `TodoDetail`. 서버가 줄 수 있는 `null`(memo/imageUrl)을 빈 문자열로
 * 정규화한다(D-68/AD-2) — `TodoMemoBox`·`TodoImageBox`에 "메모 없음"과 "빈 메모"를
 * 구분해 표시할 UI가 없기 때문이다.
 */
export function toTodoDetail(dto: TodoDetailDto): TodoDetail {
  return {
    id: dto.id,
    todo: dto.name,
    memo: dto.memo ?? '',
    imageUrl: dto.imageUrl ?? '',
    isFinish: dto.isCompleted,
  };
}

/**
 * `draft`와 `base`(서버 응답의 화면 투영)를 필드별로 비교해 **바뀐 필드만** 담은
 * PATCH 바디를 만든다(D-69). 반환값의 키 개수가 그대로 "수정 완료" 버튼의 isDirty
 * 판정이자 no-op PATCH 방지 수단이다 — 별도의 비교 헬퍼를 두지 않는다.
 */
export function toUpdateTodoInput(draft: TodoDetail, base: TodoDetail): UpdateTodoInput {
  const patch: UpdateTodoInput = {};

  if (draft.todo !== base.todo) {
    patch.name = draft.todo;
  }
  if (draft.memo !== base.memo) {
    patch.memo = draft.memo;
  }
  if (draft.imageUrl !== base.imageUrl) {
    patch.imageUrl = draft.imageUrl;
  }
  if (draft.isFinish !== base.isFinish) {
    patch.isCompleted = draft.isFinish;
  }

  return patch;
}
