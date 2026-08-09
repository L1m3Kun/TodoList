import { StrictMode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { TodoSection } from '@components/Todo/section';
import type { Todo } from '@/types';

afterEach(cleanup);

const TODOS: Todo[] = [
  { id: 1, todo: '장보기', isFinish: false },
  { id: 2, todo: '청소하기', isFinish: false },
];

describe('TodoSection', () => {
  it('isLoading=true이면 스켈레톤을 렌더링하고 "할 일이 없어요"는 렌더링하지 않는다.', () => {
    const { container } = render(
      <TodoSection variant="todo" todos={[]} isLoading />,
      { wrapper: StrictMode }
    );

    // 스켈레톤은 aria-hidden 처리된 placeholder 행들로 구성된다(TodoListSkeleton 계약).
    const skeletonRows = container.querySelectorAll(
      '[aria-hidden="true"] > *'
    );
    expect(skeletonRows.length).toBe(3);
    expect(
      screen.queryByText(/할 일이 없어요/)
    ).not.toBeInTheDocument();
  });

  it('isLoading=true이면 body 컨테이너에 aria-busy={true}를 설정한다.', () => {
    const { container } = render(
      <TodoSection variant="todo" todos={[]} isLoading />,
      { wrapper: StrictMode }
    );

    const busyContainer = container.querySelector('[aria-busy]');
    expect(busyContainer).toHaveAttribute('aria-busy', 'true');
  });

  it('isLoading=false + 빈 배열이면 variant별 기존 Empty를 렌더링한다.', () => {
    const { rerender } = render(
      <TodoSection variant="todo" todos={[]} isLoading={false} />,
      { wrapper: StrictMode }
    );
    expect(screen.getByText('할 일이 없어요.')).toBeInTheDocument();

    rerender(
      <StrictMode>
        <TodoSection variant="done" todos={[]} isLoading={false} />
      </StrictMode>
    );
    expect(screen.getByText('아직 다 한 일이 없어요.')).toBeInTheDocument();
  });

  it('isLoading을 지정하지 않으면(기존 동작) 빈 배열일 때 Empty를 렌더링한다.', () => {
    render(<TodoSection variant="todo" todos={[]} />, {
      wrapper: StrictMode,
    });

    expect(screen.getByText('할 일이 없어요.')).toBeInTheDocument();
    expect(screen.queryByText('장보기')).not.toBeInTheDocument();
  });

  it('항목이 있으면(isLoading 미지정) 목록을 렌더링한다.', () => {
    render(<TodoSection variant="todo" todos={TODOS} />, {
      wrapper: StrictMode,
    });

    expect(screen.getByText('장보기')).toBeInTheDocument();
    expect(screen.getByText('청소하기')).toBeInTheDocument();
    expect(screen.queryByText(/할 일이 없어요/)).not.toBeInTheDocument();
  });
});
