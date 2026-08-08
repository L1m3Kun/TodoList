import { StrictMode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { TodoListSkeleton } from '@components/Todo/section';

afterEach(cleanup);

const SKELETON_ROW_COUNT = 3;

describe('TodoListSkeleton', () => {
  it('placeholder 행을 3개 렌더링한다.', () => {
    const { container } = render(<TodoListSkeleton />, {
      wrapper: StrictMode,
    });

    const rows = container.firstElementChild?.children ?? [];
    expect(rows.length).toBe(SKELETON_ROW_COUNT);
  });

  it('스크린리더에 노출하지 않도록 최상위 컨테이너에 aria-hidden을 설정한다.', () => {
    const { container } = render(<TodoListSkeleton />, {
      wrapper: StrictMode,
    });

    expect(container.firstElementChild).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('TodoItem과 동일한 기하 클래스를 갖는 행을 렌더링한다.', () => {
    const { container } = render(<TodoListSkeleton />, {
      wrapper: StrictMode,
    });

    const row = container.firstElementChild?.firstElementChild;
    expect(row).toHaveClass('h-12.5');
    expect(row).toHaveClass('rounded-[27px]');
    expect(row).toHaveClass('border-2');
    expect(row).toHaveClass('border-slate-900');
    expect(row).toHaveClass('w-full');
    expect(row).toHaveClass('min-w-0');
  });
});
