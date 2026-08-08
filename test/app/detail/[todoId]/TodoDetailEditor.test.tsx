import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';

import { TodoDetailEditor } from '@/app/detail/[todoId]/TodoDetailEditor';
import { TEST_API_BASE_URL, mockTodoDetail, mockUploadImageResult } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

describe('TodoDetailEditor', () => {
  it('서버가 memo/imageUrl로 null을 줘도 렌더가 깨지지 않는다 (AD-2 정규화 회귀).', () => {
    // mockTodoDetail 자체가 memo: null, imageUrl: null이다.
    render(
      <TodoDetailEditor detail={mockTodoDetail} onSave={vi.fn()} onDelete={vi.fn()} />,
      { wrapper: StrictMode }
    );

    expect(screen.getByPlaceholderText('메모를 입력해주세요')).toHaveValue('');
    expect(screen.getByRole('button', { name: '추가하기' })).toBeInTheDocument();
    expect(screen.queryByAltText('할 일 첨부 이미지')).not.toBeInTheDocument();
  });

  it('아무것도 바꾸지 않으면 수정 완료 버튼이 disabled다.', () => {
    render(
      <TodoDetailEditor detail={mockTodoDetail} onSave={vi.fn()} onDelete={vi.fn()} />,
      { wrapper: StrictMode }
    );

    expect(screen.getByRole('button', { name: '수정 완료' })).toBeDisabled();
  });

  it('메모를 바꿔도 저장 전에는 onSave가 호출되지 않고, 저장을 누르면 바뀐 필드만 담아 1회 호출한다 (AD-2 diff 회귀).', async () => {
    const handleSave = vi.fn().mockResolvedValue({ ...mockTodoDetail, memo: '입력값' });

    render(
      <TodoDetailEditor detail={mockTodoDetail} onSave={handleSave} onDelete={vi.fn()} />,
      { wrapper: StrictMode }
    );

    const memoBox = screen.getByPlaceholderText('메모를 입력해주세요');
    fireEvent.change(memoBox, { target: { value: '입력값' } });
    expect(handleSave).not.toHaveBeenCalled();

    const saveButton = screen.getByRole('button', { name: '수정 완료' });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() => expect(handleSave).toHaveBeenCalledTimes(1));
    expect(handleSave).toHaveBeenCalledWith({ memo: '입력값' });
  });

  it('저장 진행 중에는 버튼이 disabled되어 중복 클릭해도 1회만 호출된다.', async () => {
    let resolveSave!: (value: typeof mockTodoDetail) => void;
    const handleSave = vi.fn(
      () =>
        new Promise<typeof mockTodoDetail>((resolve) => {
          resolveSave = resolve;
        })
    );

    render(
      <TodoDetailEditor detail={mockTodoDetail} onSave={handleSave} onDelete={vi.fn()} />,
      { wrapper: StrictMode }
    );

    fireEvent.change(screen.getByPlaceholderText('메모를 입력해주세요'), {
      target: { value: '입력값' },
    });
    const saveButton = screen.getByRole('button', { name: '수정 완료' });

    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(handleSave).toHaveBeenCalledTimes(1);

    resolveSave(mockTodoDetail);
  });

  it('삭제하기를 누르면 onDelete가 호출된다.', () => {
    const handleDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <TodoDetailEditor detail={mockTodoDetail} onSave={vi.fn()} onDelete={handleDelete} />,
      { wrapper: StrictMode }
    );

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));

    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it('파일을 선택하면 즉시 업로드 POST가 1회 나가고 성공 시 미리보기 URL이 갱신된다 (D-72).', async () => {
    let uploadCalls = 0;
    server.use(
      http.post(`${TEST_API_BASE_URL}/images/upload`, () => {
        uploadCalls += 1;
        return HttpResponse.json(mockUploadImageResult);
      })
    );

    render(
      <TodoDetailEditor detail={mockTodoDetail} onSave={vi.fn()} onDelete={vi.fn()} />,
      { wrapper: StrictMode }
    );

    expect(screen.queryByAltText('할 일 첨부 이미지')).not.toBeInTheDocument();

    const fileInput = screen.getByLabelText<HTMLInputElement>('할 일 첨부 이미지 파일 선택');
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(uploadCalls).toBe(1));
    await waitFor(() =>
      expect(screen.getByAltText('할 일 첨부 이미지')).toHaveAttribute(
        'src',
        mockUploadImageResult.url
      )
    );
  });

  it('업로드 실패 시 에러 메시지가 이미지 박스 근처에 뜨고 원시 서버 메시지는 없다.', async () => {
    server.use(
      http.post(`${TEST_API_BASE_URL}/images/upload`, () =>
        HttpResponse.json({ message: 'upload exploded internally' }, { status: 500 })
      )
    );

    render(
      <TodoDetailEditor detail={mockTodoDetail} onSave={vi.fn()} onDelete={vi.fn()} />,
      { wrapper: StrictMode }
    );

    const fileInput = screen.getByLabelText<HTMLInputElement>('할 일 첨부 이미지 파일 선택');
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(
        screen.getByText('서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
      ).toBeInTheDocument()
    );
    expect(document.body.textContent).not.toContain('upload exploded internally');
  });

  it('완료 토글을 클릭하면 드래프트만 바뀌고(onSave 미호출) 수정 완료가 활성화된다.', () => {
    render(
      <TodoDetailEditor detail={mockTodoDetail} onSave={vi.fn()} onDelete={vi.fn()} />,
      { wrapper: StrictMode }
    );

    fireEvent.click(screen.getByText(mockTodoDetail.name));

    expect(screen.getByRole('button', { name: '수정 완료' })).not.toBeDisabled();
  });
});
