'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';
import { Todo } from '@/types';
import CheckBox from '@assets/icon/checkbox/Property1=Default.svg';
import CheckedBox from '@assets/icon/checkbox/Property1=Frame 2610233.svg';

interface TodoItemProps {
  todo: Todo;
  onToggle?: (todo: Todo) => void;
}

function TodoItem({ todo, onToggle }: TodoItemProps) {
  const { id, isFinish, todo: description } = todo;

  const handleToggle = () => {
    onToggle?.(todo);
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-start gap-4 w-full min-w-0 h-12.5 rounded-[27px] border-2 border-slate-900 py-4.5 px-2 font-normal text-[16px] text-slate-800',
        isFinish ? 'bg-violet-100' : 'bg-white'
      )}
    >
      <button
        type="button"
        className="relative z-10"
        onClick={handleToggle}
        aria-label={isFinish ? '완료 취소' : '완료로 표시'}
        aria-pressed={isFinish}
      >
        {isFinish ? (
          <CheckedBox width="32" height="32" aria-hidden="true" />
        ) : (
          <CheckBox width="32" height="32" aria-hidden="true" />
        )}
      </button>
      <Link
        href={`/detail/${id}`}
        className={cn(
          'block min-w-0 truncate after:absolute after:inset-0',
          isFinish ? 'line-through' : ''
        )}
      >
        {description}
      </Link>
    </div>
  );
}

export { TodoItem, type TodoItemProps };
