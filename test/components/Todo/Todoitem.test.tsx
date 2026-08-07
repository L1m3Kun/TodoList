import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { TodoItem } from '@components/Todo';
import type { Todo } from '@/types';

afterEach(cleanup);

const UNFINISHED_TODO: Todo = { id: 1, todo: '장보기', isFinish: false };
const FINISHED_TODO: Todo = { id: 2, todo: '장보기', isFinish: true };

describe('TodoItem', () => {
  it('todo 텍스트를 렌더링한다.', () => {
    render(<TodoItem todo={UNFINISHED_TODO} />);

    expect(screen.getByText('장보기')).toBeInTheDocument();
  });

  it('isFinish가 false이면 미체크 아이콘을 렌더링하고 line-through를 적용하지 않으며 bg-white 클래스를 적용한다.', () => {
    render(<TodoItem todo={UNFINISHED_TODO} />);
    const label = screen.getByText('장보기');
    // 루트 컨테이너는 role이 없는 순수 클릭 div라 접근성 쿼리로 못 잡는다.
    // label(span)의 부모가 곧 루트 div다(TodoItem.tsx 구조상 span은 루트의 직계 자식).
    const container = label.parentElement as HTMLElement;

    expect(label).not.toHaveClass('line-through');
    expect(container).toHaveClass('bg-white');
    expect(container).not.toHaveClass('bg-violet-100');
    // TodoItemDetail(text-xl/font-bold)과 달리 TodoItem은 더 작은 텍스트 클래스를 쓴다.
    expect(container).toHaveClass('text-[16px]');
    expect(container).toHaveClass('font-normal');

    // PLAN-5: CheckBox/CheckedBox 둘 다 alt·aria-label·data-test-id가 없어 접근성
    // 쿼리로 구분 불가(result-ST-1.md 실측). container.querySelector를 예외적으로 사용.
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('svg path')).not.toBeInTheDocument();
  });

  it('isFinish가 true이면 체크 아이콘을 렌더링하고 line-through를 적용하며 bg-violet-100 클래스를 적용한다.', () => {
    render(<TodoItem todo={FINISHED_TODO} />);
    const label = screen.getByText('장보기');
    const container = label.parentElement as HTMLElement;

    expect(label).toHaveClass('line-through');
    expect(container).toHaveClass('bg-violet-100');
    expect(container).not.toHaveClass('bg-white');

    // PLAN-5: CheckedBox(완료)는 체크마크 <path>를 포함한다(result-ST-1.md 실측).
    expect(container.querySelector('svg path')).toBeInTheDocument();
  });
});
