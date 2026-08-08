import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { Input } from '@components/input';

afterEach(cleanup);

function ControlledInput({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const handleChange = (newValue: string) => {
    setValue(newValue);
  };
  return <Input value={value} onChange={handleChange} />;
}

describe('Input', () => {
  it('기본 placeholder가 렌더링된다.', () => {
    render(<Input value="" onChange={vi.fn()} />);

    expect(
      screen.getByPlaceholderText('할 일을 입력해주세요')
    ).toBeInTheDocument();
  });

  it('value prop이 입력창에 표시된다.', () => {
    render(<Input value="장보기" onChange={vi.fn()} />);

    expect(screen.getByRole('textbox')).toHaveValue('장보기');
  });

  it('입력 시 onChange가 호출되고 새 값을 문자열로 전달받는다.', () => {
    let capturedValue = '';
    const handleChange = vi.fn((newValue: string) => {
      capturedValue = newValue;
    });
    render(<Input value="" onChange={handleChange} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '빨래하기' },
    });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(capturedValue).toBe('빨래하기');
  });

  it('controlled wrapper를 통해 입력한 값이 화면에 반영된다.', () => {
    render(<ControlledInput initialValue="" />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '청소하기' },
    });

    expect(screen.getByRole('textbox')).toHaveValue('청소하기');
  });

  it('placeholder prop을 전달하면 기본 placeholder를 덮어쓴다.', () => {
    render(<Input value="" onChange={vi.fn()} placeholder="검색어 입력" />);

    expect(screen.getByPlaceholderText('검색어 입력')).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('할 일을 입력해주세요')
    ).not.toBeInTheDocument();
  });

  it('className prop을 전달하면 tailwind-merge로 기본 클래스와 병합된다.', () => {
    render(<Input value="" onChange={vi.fn()} className="bg-red-500" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('bg-red-500');
    expect(input).not.toHaveClass('bg-slate-100');
    expect(input).toHaveClass('border-2', 'rounded-3xl');
  });

  it('나머지 props(disabled 등)가 실제 input 엘리먼트로 전달된다.', () => {
    render(<Input value="" onChange={vi.fn()} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
