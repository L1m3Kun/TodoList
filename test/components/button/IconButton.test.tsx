import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { IconButton } from '@components/button';

afterEach(cleanup);

describe('IconButton', () => {
  it('variant가 add이면, + 아이콘을 렌더링하다.', () => {
    // D-11/D-12: 소스(components/button/IconButton.tsx)는 아이콘만 렌더해 텍스트로는
    // 접근 가능한 이름이 없었다(D-3이 지목한 실제 a11y 결함). aria-label="추가하기"를
    // 부여해 이름을 만들었으므로 getByRole(name)으로 접근한다.
    render(<IconButton variant="add" />);
    const button = screen.getByRole('button', { name: '추가하기' });
    expect(button).toHaveClass('bg-slate-200');
    expect(button).toHaveAttribute('type', 'button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('variant를 선택하지 않으면 variant=add로 렌더링한다.', () => {
    // PLAN-3 / D-5(사용자 승인): IconButton도 Button과 동일한 구조 — cva defaultVariants는
    // className 계산에만 적용되고 컴포넌트 내부 switch(variant) 분기에는 적용되지 않는다.
    // variant 생략 시 switch가 default 분기로 떨어져 즉시 예외를 던지는 것이 실제 동작이다.
    // 제목(스캐폴딩 원문)은 유지하고, 본문은 실제 동작(throw)을 검증한다.
    expect(() => render(<IconButton />)).toThrow(
      'IconButton Variant Error: select IconButton Variant.'
    );
  });

  it('variant가 edit이면, Edit 아이콘을 렌더링한다.', () => {
    // edit도 아이콘만 렌더해 접근 가능한 이름이 없었다. aria-label="수정하기" 부여.
    render(<IconButton variant="edit" />);
    const button = screen.getByRole('button', { name: '수정하기' });
    expect(button).toHaveClass('bg-slate-900/50');
    // 실제 값 단언(존재 확인이 아님) — 소스 확인 결과 add/edit 모두 type="button"으로
    // 하드코딩되어 있다(variant에 따라 달라지지 않는다).
    expect(button).toHaveAttribute('type', 'button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('className을 props로 전달하면 기존 클래스와 병합된다.', () => {
    render(<IconButton variant="add" className="bg-amber-500" />);
    const button = screen.getByRole('button', { name: '추가하기' });
    // tailwind-merge: 같은 유틸리티 그룹(bg-*)끼리는 나중 값이 이전 값을 대체한다.
    expect(button).toHaveClass('bg-amber-500');
    expect(button).not.toHaveClass('bg-slate-200');
  });

  it('disabled를 전달하면 버튼이 비활성화된다.', () => {
    render(<IconButton variant="add" disabled />);
    expect(screen.getByRole('button', { name: '추가하기' })).toBeDisabled();
  });

  it('클릭하면 onClick 핸들러가 호출된다.', () => {
    const handleClick = vi.fn();
    render(<IconButton variant="add" onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
