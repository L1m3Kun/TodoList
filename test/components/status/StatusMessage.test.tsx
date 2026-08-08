import { StrictMode, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { StatusMessage } from '@components/status';

afterEach(cleanup);

// S-10: 컴포넌트 테스트는 StrictMode wrapper로 돌린다(D-66 회귀 전례).
function renderStatusMessage(ui: ReactElement) {
  return render(ui, { wrapper: StrictMode });
}

describe('StatusMessage', () => {
  it('tone이 error이면 컨테이너에 role="alert"를 부여한다.', () => {
    renderStatusMessage(
      <StatusMessage tone="error" title="불러오지 못했습니다" />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('tone이 loading이면 컨테이너에 role="status" aria-live="polite"를 부여한다.', () => {
    renderStatusMessage(
      <StatusMessage tone="loading" title="불러오는 중입니다" />
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('title을 렌더링한다.', () => {
    renderStatusMessage(
      <StatusMessage tone="error" title="문제가 발생했습니다" />
    );

    expect(screen.getByText('문제가 발생했습니다')).toBeInTheDocument();
  });

  it('description을 전달하면 렌더링한다.', () => {
    renderStatusMessage(
      <StatusMessage
        tone="error"
        title="문제가 발생했습니다"
        description="잠시 후 다시 시도해주세요"
      />
    );

    expect(
      screen.getByText('잠시 후 다시 시도해주세요')
    ).toBeInTheDocument();
  });

  it('description을 전달하지 않으면 description 영역을 렌더링하지 않는다.', () => {
    const { container } = renderStatusMessage(
      <StatusMessage tone="error" title="문제가 발생했습니다" />
    );

    // title <p> 하나만 존재해야 한다 — description <p>가 추가로 생기지 않는다.
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('onRetry를 전달하지 않으면 다시 시도 버튼을 렌더링하지 않는다.', () => {
    renderStatusMessage(
      <StatusMessage tone="error" title="문제가 발생했습니다" />
    );

    expect(
      screen.queryByRole('button', { name: '다시 시도' })
    ).not.toBeInTheDocument();
  });

  it('onRetry를 전달하면 다시 시도 버튼을 렌더링하고, 클릭하면 onRetry가 호출된다.', () => {
    const handleRetry = vi.fn();
    renderStatusMessage(
      <StatusMessage
        tone="error"
        title="문제가 발생했습니다"
        onRetry={handleRetry}
      />
    );

    const button = screen.getByRole('button', { name: '다시 시도' });
    expect(button).toHaveAttribute('type', 'button');

    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('className prop을 전달하면 tailwind-merge로 기존 클래스와 병합된다.', () => {
    renderStatusMessage(
      <StatusMessage
        tone="error"
        title="문제가 발생했습니다"
        className="bg-blue-500"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-blue-500');
    expect(alert).not.toHaveClass('bg-white');
  });
});
