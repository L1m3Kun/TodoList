import type { KeyboardEvent } from 'react';

import CheckBox from '@assets/icon/checkbox/Property 1=Default.svg';
import CheckedBox from '@assets/icon/checkbox/Property 1=Frame 2610233.svg';
import { cn } from '@/lib/utils';

interface TodoItemDetailProps {
  todo: string;
  isFinish: boolean;
  finishTodo: () => void;
}

function TodoItemDetail({ todo, isFinish, finishTodo }: TodoItemDetailProps) {
  const handleClickTodo = () => {
    finishTodo();
  };

  const handleKeyDownTodo = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    // Space의 기본 동작(페이지 스크롤)을 막는다.
    if (e.key === ' ') e.preventDefault();
    finishTodo();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isFinish}
      className={cn(
        'flex items-center justify-center gap-4 w-full h-16 rounded-3xl border-2 border-slate-900 py-4.5 px-2 font-bold text-xl text-slate-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2',
        isFinish ? 'bg-violet-100' : 'bg-white'
      )}
      onClick={handleClickTodo}
      onKeyDown={handleKeyDownTodo}
    >
      {isFinish ? (
        <CheckedBox width="32" height="32" />
      ) : (
        <CheckBox width="32" height="32" />
      )}
      <span className="underline underline-offset-0">{todo}</span>
    </div>
  );
}

export { TodoItemDetail, type TodoItemDetailProps };
