'use client';

import Image from 'next/image';
import { ReactNode } from 'react';

import TodoBadge from '@assets/images/badge/todo/todo@3x.png';
import DoneBadge from '@assets/images/badge/done/done@3x.png';

import { Todo } from '@/types';
import { TodoList } from '../TodoList';
import { TodoEmpty } from '@/components/empty';
import { DoneEmpty } from '@/components/empty';
import { TodoListSkeleton } from './TodoListSkeleton';

interface TodoSectionProps {
  variant: 'todo' | 'done';
  children?: ReactNode;
  todos: Todo[];
  onToggle?: (todo: Todo) => void;
  isLoading?: boolean;
}

function TodoSection({
  variant,
  todos,
  onToggle,
  isLoading = false,
}: TodoSectionProps) {
  const badgeImageUrl = () => {
    if (variant === 'todo') {
      return TodoBadge;
    }
    return DoneBadge;
  };

  let body = <TodoList todos={todos} onToggle={onToggle} />;

  if (isLoading) {
    body = <TodoListSkeleton />;
  } else if (todos.length === 0) {
    if (variant === 'todo') {
      body = <TodoEmpty />;
    } else {
      body = <DoneEmpty />;
    }
  }
  return (
    <div className="flex flex-col flex-1 min-w-0 w-full gap-4">
      <div className="max-h-9">
        <Image
          alt="할 일 진행도 태그"
          src={badgeImageUrl()}
          width={101}
          height={36}
        />
      </div>
      <div
        className="flex items-center justify-center w-full"
        aria-busy={isLoading}
      >
        {body}
      </div>
    </div>
  );
}

export { TodoSection, type TodoSectionProps };
