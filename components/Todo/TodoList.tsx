'use client';

import type { Todo } from '@/types';
import { TodoItem } from './TodoItem';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface TodoListProps {
  todos: Todo[];
  onToggle?: (todo: Todo) => void;
  className?: string;
}

function TodoListCompo({ todos, onToggle, className }: TodoListProps) {
  return (
    <div className={cn('w-full min-w-0', className)}>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onToggle={onToggle} />
      ))}
    </div>
  );
}

const TodoList = memo(TodoListCompo);

export { TodoList, type TodoListProps };
