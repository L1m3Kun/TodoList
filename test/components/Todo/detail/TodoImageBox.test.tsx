import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { TodoImageBox } from '@components/Todo/detail';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TodoImageBox', () => {
  it('imageUrl이 없으면 플레이스홀더 아이콘과 추가 버튼을 렌더링한다.', () => {
    render(<TodoImageBox />, { wrapper: StrictMode });

    expect(
      screen.getByRole('button', { name: '추가하기' })
    ).toBeInTheDocument();
    expect(screen.queryByAltText('할 일 첨부 이미지')).not.toBeInTheDocument();
  });

  it('imageUrl이 있으면 이미지와 수정 버튼을 렌더링한다.', () => {
    render(<TodoImageBox imageUrl="https://example.com/a.png" />, {
      wrapper: StrictMode,
    });

    expect(screen.getByAltText('할 일 첨부 이미지')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '수정하기' })
    ).toBeInTheDocument();
  });

  it('isUploading 미지정 시 aria-busy와 진행 표시가 렌더되지 않는다(기본 렌더 동일성).', () => {
    const { container } = render(<TodoImageBox />, { wrapper: StrictMode });

    expect(container.firstChild).not.toHaveAttribute('aria-busy');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '추가하기' })).not.toBeDisabled();
  });

  it('이미지 파일을 선택하면 onSelectImage가 호출된다.', () => {
    const handleSelectImage = vi.fn();
    render(<TodoImageBox onSelectImage={handleSelectImage} />, {
      wrapper: StrictMode,
    });

    const input = screen.getByLabelText<HTMLInputElement>(
      '할 일 첨부 이미지 파일 선택'
    );
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(handleSelectImage).toHaveBeenCalledTimes(1);
    expect(handleSelectImage).toHaveBeenCalledWith(file);
  });

  it('비이미지 파일을 선택하면 onSelectImage가 호출되지 않는다(조용히 무시).', () => {
    const handleSelectImage = vi.fn();
    render(<TodoImageBox onSelectImage={handleSelectImage} />, {
      wrapper: StrictMode,
    });

    const input = screen.getByLabelText<HTMLInputElement>(
      '할 일 첨부 이미지 파일 선택'
    );
    const file = new File(['data'], 'note.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(handleSelectImage).not.toHaveBeenCalled();
  });

  it('isUploading=true이면 aria-busy와 진행 표시(role=status)가 렌더된다.', () => {
    const { container } = render(<TodoImageBox isUploading />, {
      wrapper: StrictMode,
    });

    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('업로드 중');
  });

  it('isUploading=true이면 트리거 버튼이 disabled되어 재선택이 동작하지 않는다.', () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
    render(<TodoImageBox isUploading />, { wrapper: StrictMode });

    const button = screen.getByRole('button', { name: '추가하기' });
    expect(button).toBeDisabled();

    fireEvent.click(button);

    expect(clickSpy).not.toHaveBeenCalled();
  });
});
