import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// NOTE(발견한 결함, D-3/D-4 원칙 적용): `components/Todo/detail/index.ts`(배럴)가
// 빈 파일(0바이트)이라 `@components/Todo/detail`에서 import하면
// `TS2306: File '...index.ts' is not a module.` 에러가 난다
// (npx tsc --noEmit로 실측 확인, __probe__ 임시 파일로 검증 후 삭제함).
// 프로덕션 파일(components/**)은 1바이트도 수정할 수 없으므로(implementation.md §4),
// D-3/D-4와 동일한 원칙(계획의 전제가 실제 소스 상태와 어긋나면 테스트 쪽을 소스에 맞춘다)을
// 적용해 소스 파일 경로에서 직접 import한다. 배럴에 `export * from './TodoItemDetail';`
// 한 줄을 추가하는 것은 이번 태스크 스코프 밖이므로 후속 과제로 남긴다(result-ST-2.md 참조).
import { TodoItemDetail } from '@components/Todo';

afterEach(cleanup);

describe('TodoItemDetail', () => {
  it('todo 텍스트를 렌더링한다.', () => {
    render(
      <TodoItemDetail todo="장보기" isFinish={false} finishTodo={vi.fn()} />
    );

    expect(screen.getByText('장보기')).toBeInTheDocument();
  });

  it('isFinish가 false이면 미체크 아이콘을 렌더링하고 bg-white 클래스를 적용하며 underline은 항상 적용한다.', () => {
    render(
      <TodoItemDetail todo="장보기" isFinish={false} finishTodo={vi.fn()} />
    );
    const label = screen.getByText('장보기');
    // 루트 컨테이너는 role이 없는 순수 클릭 div라 접근성 쿼리로 못 잡는다.
    const container = label.parentElement as HTMLElement;

    // TodoItem은 isFinish에 따라 line-through가 조건부지만, TodoItemDetail의
    // underline은 소스상 조건부가 아니라 항상 적용된다(ST-2 명세, 소스 확인 완료).
    expect(label).toHaveClass('underline');
    expect(container).toHaveClass('bg-white');
    expect(container).not.toHaveClass('bg-violet-100');
    // TodoItem(text-[16px]/font-normal)과 달리 상세뷰는 더 큰 텍스트 클래스를 쓴다.
    expect(container).toHaveClass('text-xl');
    expect(container).toHaveClass('font-bold');

    // PLAN-5: CheckBox/CheckedBox 둘 다 alt·aria-label·data-test-id가 없어 접근성
    // 쿼리로 구분 불가(result-ST-1.md 실측). container.querySelector를 예외적으로 사용.
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('svg path')).not.toBeInTheDocument();
  });

  it('isFinish가 true이면 체크 아이콘을 렌더링하고 bg-violet-100 클래스를 적용하며 underline을 유지한다.', () => {
    render(
      <TodoItemDetail todo="장보기" isFinish={true} finishTodo={vi.fn()} />
    );
    const label = screen.getByText('장보기');
    const container = label.parentElement as HTMLElement;

    expect(label).toHaveClass('underline');
    expect(container).toHaveClass('bg-violet-100');
    expect(container).not.toHaveClass('bg-white');

    // PLAN-5: CheckedBox(완료)는 체크마크 <path>를 포함한다(result-ST-1.md 실측).
    expect(container.querySelector('svg path')).toBeInTheDocument();
  });

  it('컨테이너를 클릭하면 finishTodo가 호출된다.', () => {
    const finishTodo = vi.fn();
    render(
      <TodoItemDetail todo="장보기" isFinish={false} finishTodo={finishTodo} />
    );
    const container = screen.getByText('장보기').parentElement as HTMLElement;

    fireEvent.click(container);

    expect(finishTodo).toHaveBeenCalledTimes(1);
  });
});
