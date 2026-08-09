'use client';

import { AddSection } from '@/components/addSection';
import { StatusMessage } from '@/components/status';
import { TodoSection } from '@/components/Todo/section';
import { toTodo } from '@/lib/adapters';
import { useTodoList } from '@/hooks/useTodoList';
import type { Todo } from '@/types';

// AD-11 — 인자를 생략하면 서버 기본값(1/10)이 적용돼 11번째 항목부터 조용히 사라진다.
// 페이지네이션 UI가 없으므로 넉넉한 값을 이름 붙인 상수로 고정한다.
const TODO_PAGE_SIZE = 100;

export default function Home() {
  const { items, isLoading, error, refetch, createTodo, toggleTodo } = useTodoList({
    page: 1,
    pageSize: TODO_PAGE_SIZE,
  });

  // 렌더 중 파생(S-5) — items(DTO) → todos(화면 타입) 변환은 lib/adapters 한 곳만 담당한다(S-1).
  const todos = items.map(toTodo);
  const todoList = todos.filter((t) => !t.isFinish);
  const doneList = todos.filter((t) => t.isFinish);

  // H-2 — toggle/add/delete 성공은 전부 refetch()를 부르고, useTodoList의 fetchList()는
  // 시작 즉시 isLoading:true를 세운다(훅은 건드리지 않는다, S-3). isLoading을 그대로
  // 넘기면 이미 화면에 떠 있는 items가 매 뮤테이션마다 스켈레톤으로 잠깐 교체된다.
  // 최초 로드(items가 아직 하나도 없을 때)에만 스켈레톤을 보여주고, 재동기화 중에는
  // 기존 목록을 유지한다.
  const isInitialLoading = isLoading && items.length === 0;

  // S-4 — 화면에는 error.message만 노출한다(serverMessage/details 접근 금지).
  const errorMessage = error?.message ?? null;
  // AD-8 error_display_rule — 데이터가 하나도 없을 때는 섹션을 StatusMessage로 치환하고,
  // 데이터가 있는 채로 뮤테이션만 실패했으면 섹션 위에 배너로 병기한다.
  const showErrorOnly = errorMessage !== null && items.length === 0;

  async function handleAddTodo(name: string): Promise<boolean> {
    return (await createTodo({ name })) !== null;
  }

  function handleToggleTodo(todo: Todo): void {
    void toggleTodo(todo.id, !todo.isFinish);
  }

  return (
    <div className="flex flex-col gap-6 phone:gap-26 w-full max-w-300 mx-auto px-4 tablet:px-4 my-19 phone:my-24">
      <AddSection onAddTodo={handleAddTodo} />
      {errorMessage ? (
        <StatusMessage tone="error" title={errorMessage} onRetry={refetch} />
      ) : null}
      {showErrorOnly ? null : (
        <div className="flex items-start justify-center gap-4 tablet:gap-31 max-tablet:flex-col">
          <TodoSection
            todos={todoList}
            variant="todo"
            onToggle={handleToggleTodo}
            isLoading={isInitialLoading}
          />
          <TodoSection
            todos={doneList}
            variant="done"
            onToggle={handleToggleTodo}
            isLoading={isInitialLoading}
          />
        </div>
      )}
    </div>
  );
}
