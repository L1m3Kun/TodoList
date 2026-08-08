import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { Button } from '@components/button';

afterEach(cleanup);

describe('Button', () => {
  it('variant가 add이면, + 추가하기를 렌더링하고 배경을 slate-200을 적용한다.', () => {
    render(<Button variant="add" />);
    // D-11/D-12: add variant에 aria-label="추가하기"가 부여되어 접근 가능한 이름이 생겼다.
    // getByRole(name)으로 통일 — data-testid는 최후 수단이므로 사용하지 않는다.
    const button = screen.getByRole('button', { name: '추가하기' });
    expect(button).toHaveClass('bg-slate-200');
    // PLAN-2: 시각적으로 보이는 "추가하기" 문구 자체는 여전히 실제 텍스트 노드가 아니라
    // tablet:after:content-["추가하기"] Tailwind 클래스가 만드는 CSS ::after 생성 콘텐츠다.
    // jsdom은 레이아웃 엔진이 없어 생성 콘텐츠를 계산하지 않으므로 그 시각적 문구 자체는
    // 클래스 존재로만 단언 가능하다(접근 가능한 이름은 aria-label로 별도 보장됨).
    expect(button).toHaveClass('tablet:after:content-["추가하기"]');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('variant를 선택하지 않으면 variant=add로 렌더링한다.', () => {
    // PLAN-3 / D-5(사용자 승인): cva의 defaultVariants는 className 계산에만 적용되고
    // 컴포넌트 내부 switch(variant) 분기에는 적용되지 않는다. variant를 생략하면
    // switch가 default 분기로 떨어져 즉시 예외를 던지는 것이 실제 동작이다.
    // 제목(스캐폴딩 원문)은 유지하고, 본문은 실제 동작(throw)을 검증한다.
    // 소스 수정은 이번 태스크 스코프 밖(프로덕션 동작 불변).
    expect(() => render(<Button />)).toThrow(
      'Button Variant Error: select Button Variant.'
    );
  });

  it('variant가 delete이면, x 삭제하기를 렌더링하고 배경을 rose-500을 적용한다.', () => {
    render(<Button variant="delete" />);
    // delete는 "삭제하기"가 실제 텍스트 노드라 접근 가능한 이름이 이미 있다.
    // aria-label을 추가하지 않는다(텍스트를 덮어써 오히려 해롭다) — getByRole(name)으로 접근.
    const button = screen.getByRole('button', { name: '삭제하기' });
    expect(button).toHaveClass('bg-rose-500');
    expect(button).toHaveClass('text-white');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('variant가 edit이면, 수정 완료를 렌더링하고 배경을 slate-200을 적용한다.', () => {
    render(<Button variant="edit" />);
    // edit도 "수정 완료"가 실제 텍스트 노드라 접근 가능한 이름이 이미 있다. aria-label 미추가.
    const button = screen.getByRole('button', { name: '수정 완료' });
    expect(button).toHaveClass('bg-slate-200');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('edit variant의 type은 button이다.', () => {
    // D-11: 사용자가 edit variant의 type을 submit → button으로 직접 수정했다.
    // 이를 지키는 테스트가 없었으므로 실제 값을 단언한다(존재 확인이 아닌 값 확인).
    render(<Button variant="edit" />);
    const button = screen.getByRole('button', { name: '수정 완료' });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('className을 props로 전달하면 기존 내용을 덮어쓴다.', () => {
    render(<Button variant="delete" className="bg-blue-500" />);
    const button = screen.getByRole('button', { name: '삭제하기' });
    // tailwind-merge: 같은 유틸리티 그룹(bg-*)끼리는 나중 값이 이전 값을 대체한다.
    expect(button).toHaveClass('bg-blue-500');
    expect(button).not.toHaveClass('bg-rose-500');
  });

  it('disabled를 전달하면 버튼이 비활성화된다.', () => {
    render(<Button variant="edit" disabled />);
    expect(screen.getByRole('button', { name: '수정 완료' })).toBeDisabled();
  });

  it('클릭하면 onClick 핸들러가 호출된다.', () => {
    const handleClick = vi.fn();
    render(<Button variant="edit" onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
