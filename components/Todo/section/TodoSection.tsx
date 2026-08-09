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

// W-4 — next/image는 선언한 width/height 비율이 원본 비율과 어긋나면 경고한다.
// todo@3x(303×108=2.8056)는 101×36과 정확히 일치해 조용했지만,
// done@3x(291×108=2.6944)는 같은 101×36으로는 어긋나 경고가 났다.
// 정수 height를 바꿔 맞추려는 시도(36→37)는 2.7297이라 여전히 어긋난다 —
// 원본 비율이 정수 픽셀로 떨어지지 않기 때문이다.
// → 선언값을 **원본 픽셀 그대로** 두어 비율 불일치를 원천 제거하고,
//   실제 표시 크기는 CSS가 정한다(`w-[101px] h-auto`). Tailwind preflight가
//   이미 height:auto를 강제하므로 width도 CSS로 명시해야 "한쪽 치수만
//   수정됨" 경고까지 함께 사라진다. 렌더 폭은 기존과 동일한 101px.
// props·state에 의존하지 않는 상수라 컴포넌트 밖 모듈 스코프에 둔다.
const BADGE_CONFIG = {
  todo: { src: TodoBadge, width: 303, height: 108 },
  done: { src: DoneBadge, width: 291, height: 108 },
} as const;

function TodoSection({
  variant,
  todos,
  onToggle,
  isLoading = false,
}: TodoSectionProps) {
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
          src={BADGE_CONFIG[variant].src}
          width={BADGE_CONFIG[variant].width}
          height={BADGE_CONFIG[variant].height}
          className="w-[101px] h-auto"
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
