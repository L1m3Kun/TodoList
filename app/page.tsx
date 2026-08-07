'use client';

import { useCallback, useState } from 'react';

import { AddSection } from '@/components/addSection';
import { TodoSection } from '@/components/Todo/section';
import { Todo } from '@/types';

// 로컬 state 시드 값(D-29 패턴과 동일 경계) — 서버 연동이 없는 초기 목록.
// 다음 브랜치(서버 연동)에서 실제 조회 데이터 + fetch 로직으로 대체된다.
const INITIAL_TODOS: Todo[] = [
  {
    id: 1,
    isFinish: false,
    todo: '하나',
  },
  {
    id: 2,
    isFinish: false,
    todo: '하나하나하나',
  },
  {
    id: 3,
    isFinish: false,
    todo: '하나하나하나하나하나하나하나하나하나하나하나하나하나하나하나하나하나하나하나하나하나',
  },
];

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS);

  const handleToggleTodo = useCallback((todo: Todo) => {
    setTodos((curr) =>
      curr.map((t) => (t.id === todo.id ? { ...t, isFinish: !t.isFinish } : t))
    );
  }, []);

  const todoList = todos.filter((t) => !t.isFinish);
  const doneList = todos.filter((t) => t.isFinish);

  return (
    <div className="flex flex-col gap-6 phone:gap-26 w-full max-w-300 mx-auto px-4 tablet:px-4 my-19 phone:my-24">
      <AddSection />
      <div className="flex items-start justify-center gap-4 tablet:gap-31 max-tablet:flex-col">
        <TodoSection todos={todoList} variant="todo" onToggle={handleToggleTodo} />
        <TodoSection todos={doneList} variant="done" onToggle={handleToggleTodo} />
      </div>
    </div>
  );
}
