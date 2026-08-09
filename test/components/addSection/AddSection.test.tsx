import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { AddSection } from '@/components/addSection';

afterEach(cleanup);

/**
 * 클릭 없이 form 자체를 직접 submit해 S-12(부정 단언 근거)를 확보한다.
 *
 * `form.requestSubmit()`을 쓴다(단순 `fireEvent.submit`이 아니라) — 이것이
 * 실제 브라우저에서 텍스트 input에 포커스가 있을 때 Enter 키를 누르면 내부적으로
 * 호출되는 바로 그 네이티브 진입점이다(HTML 표준의 "implicit submission").
 * jsdom은 키보드 이벤트의 이 기본 동작(암묵적 제출)을 구현하지 않으므로
 * (jsdom/jsdom#1937 — HTMLInputElement에 keypress→submit 배선이 없음, 실측 확인)
 * `fireEvent.keyDown(input, { key: 'Enter' })`로는 아무 일도 일어나지 않는다.
 * `requestSubmit()`은 jsdom에서 실제로 'submit' 이벤트를 발생시키므로
 * (검증 단계 포함) Enter 키가 도달하는 것과 동일한 코드 경로를 검증하는
 * 가장 신뢰할 수 있는 대체 수단이다.
 */
function submitForm() {
  const form = document.querySelector('form');
  if (!form) throw new Error('form을 찾지 못했다.');
  form.requestSubmit();
}

/** 즉시 resolve하지 않고 외부에서 resolve 시점을 제어할 수 있는 pending promise를 만든다. */
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('AddSection', () => {
  it('빈 입력이면 버튼이 disabled이고, form을 직접 submit해도 onAddTodo가 호출되지 않는다. (H-3 회귀)', () => {
    const onAddTodo = vi.fn();
    render(<AddSection onAddTodo={onAddTodo} />, { wrapper: StrictMode });

    expect(screen.getByRole('button', { name: '추가하기' })).toBeDisabled();

    submitForm();

    expect(onAddTodo).not.toHaveBeenCalled();
  });

  it('공백만 입력해도 버튼이 disabled이고, form을 직접 submit해도 onAddTodo가 호출되지 않는다. (H-3 회귀)', () => {
    const onAddTodo = vi.fn();
    render(<AddSection onAddTodo={onAddTodo} />, { wrapper: StrictMode });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '   ' },
    });

    expect(screen.getByRole('button', { name: '추가하기' })).toBeDisabled();

    submitForm();

    expect(onAddTodo).not.toHaveBeenCalled();
  });

  it('입력 후 제출하면 trim된 값으로 1회 호출된다.', async () => {
    const onAddTodo = vi.fn().mockResolvedValue(true);
    render(<AddSection onAddTodo={onAddTodo} />, { wrapper: StrictMode });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '  빨래하기  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }));

    await screen.findByDisplayValue('');

    expect(onAddTodo).toHaveBeenCalledTimes(1);
    expect(onAddTodo).toHaveBeenCalledWith('빨래하기');
  });

  it('onAddTodo가 true를 반환하면 입력이 비워진다.', async () => {
    const onAddTodo = vi.fn().mockResolvedValue(true);
    render(<AddSection onAddTodo={onAddTodo} />, { wrapper: StrictMode });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '장보기' },
    });
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }));

    await screen.findByDisplayValue('');

    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('onAddTodo가 false를 반환하면 입력이 유지된다.', async () => {
    const onAddTodo = vi.fn().mockResolvedValue(false);
    render(<AddSection onAddTodo={onAddTodo} />, { wrapper: StrictMode });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '장보기' },
    });
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }));

    await screen.findByRole('button', { name: '추가하기' });

    expect(screen.getByRole('textbox')).toHaveValue('장보기');
  });

  it('진행 중(isSubmitting)에 두 번 제출해도 onAddTodo는 1회만 호출된다. (중복 제출 방지)', async () => {
    const deferred = createDeferred<boolean>();
    const onAddTodo = vi.fn().mockReturnValue(deferred.promise);
    render(<AddSection onAddTodo={onAddTodo} />, { wrapper: StrictMode });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '설거지하기' },
    });

    const button = screen.getByRole('button', { name: '추가하기' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    // 진행 중에 form을 직접 submit해도 막혀야 한다(버튼 클릭 경유가 아닌 경로까지 확인).
    submitForm();
    fireEvent.click(button);

    deferred.resolve(true);
    await screen.findByDisplayValue('');

    expect(onAddTodo).toHaveBeenCalledTimes(1);
  });

  it('Enter 키로 제출된다. (input이 하나뿐인 <form>이므로 Enter가 native submit을 트리거한다 — submitForm 주석 참조)', async () => {
    const onAddTodo = vi.fn().mockResolvedValue(true);
    render(<AddSection onAddTodo={onAddTodo} />, { wrapper: StrictMode });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '운동하기' } });
    submitForm();

    await screen.findByDisplayValue('');

    expect(onAddTodo).toHaveBeenCalledTimes(1);
    expect(onAddTodo).toHaveBeenCalledWith('운동하기');
  });
});
