import { StrictMode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';

import DetailPage from '@/app/detail/[todoId]/page';
import {
  TEST_API_BASE_URL,
  errorBody,
  errorHandler,
  mockTodoDetail,
} from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

// AD-9/D-77 test_note — 이 레포 최초의 vi.mock('next/navigation') 사용. next/link는
// 건드리지 않는다(기존 테스트가 unmocked로 통과 중이라 영향받으면 안 된다).
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

/**
 * ⚠️ 환경 실측(BLOCKED 후보였다가 자체 해소) — 이 레포의 React 19.2.8 + react-dom 19.2.8 +
 * jsdom 30 + Vitest 4 조합에서는 `use(promise)`가 Suspense로 처음 던진 뒤의 **재시도(ping)**가
 * DOM 커밋으로 이어지지 않는다. React 자신의 `trackUsedThenable`이 promise에 `status`/`value`를
 * 태깅하는 것(정상)까지는 확인되지만, 그 뒤 Suspense 경계의 재렌더가 실제로 일어나지 않아
 * `<Suspense fallback>`에 영원히 머문다(최소 재현: 앱 코드 없이 `use()` + `<Suspense>`만으로도
 * 동일 증상, 3초 실측·StrictMode/act/pool=forks 전부 무관).
 *
 * React가 내부에서 하는 것과 동일하게 promise를 미리 `status:'fulfilled'`로 태깅해 넘기면
 * `use()`가 **첫 렌더에서 곧바로 동기적으로** 값을 읽는다(재시도 경로를 아예 타지 않음) —
 * 이 방식으로 실제 재현 확인함. `<Suspense>`는 실제 런타임(브라우저)의 정상 서스펜드 경로를
 * 위해 그대로 유지한다(AD-6 suspense_note).
 */
function tagResolved<T>(value: T): Promise<T> {
  const promise = Promise.resolve(value) as Promise<T> & { status?: string; value?: T };
  promise.status = 'fulfilled';
  promise.value = value;
  return promise;
}

function renderDetailPage(todoId: string) {
  return render(
    <StrictMode>
      <Suspense fallback={null}>
        <DetailPage
          params={tagResolved({ todoId })}
          searchParams={tagResolved({})}
        />
      </Suspense>
    </StrictMode>
  );
}

describe('DetailPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  afterEach(() => {
    cleanup();
    server.resetHandlers();
  });

  it('잘못된 id(문자)면 네트워크 요청 없이 잘못된 주소 문구를 보여준다.', async () => {
    let calls = 0;
    server.use(
      http.get(`${TEST_API_BASE_URL}/items/:itemId`, () => {
        calls += 1;
        return HttpResponse.json(mockTodoDetail);
      })
    );

    renderDetailPage('abc');

    expect(await screen.findByText('잘못된 주소입니다.')).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('잘못된 id(지수 표기)면 네트워크 요청 없이 잘못된 주소 문구를 보여준다.', async () => {
    let calls = 0;
    server.use(
      http.get(`${TEST_API_BASE_URL}/items/:itemId`, () => {
        calls += 1;
        return HttpResponse.json(mockTodoDetail);
      })
    );

    renderDetailPage('1e3');

    expect(await screen.findByText('잘못된 주소입니다.')).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('404 응답이면 안내 문구를 보여주고 원시 서버 메시지는 화면에 없다 (S-4 회귀).', async () => {
    const serverMessage = 'Item with ID 999999 not found for tenant limekun';
    server.use(
      errorHandler('get', `${TEST_API_BASE_URL}/items/:itemId`, 404, errorBody(serverMessage))
    );

    renderDetailPage('999999');

    expect(await screen.findByText('요청한 항목을 찾을 수 없습니다.')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(serverMessage);
  });

  it('삭제 성공 시 목록(/)으로 이동하고 오류 문구는 뜨지 않는다 (D-77 / H-1 회귀).', async () => {
    renderDetailPage(String(mockTodoDetail.id));

    const deleteButton = await screen.findByRole('button', { name: '삭제하기' });
    fireEvent.click(deleteButton);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));

    // H-1 — remove() 성공은 훅 상태를 detail:null, error:null로 만든다. push()를 목킹한
    // 이 테스트 환경에서는 실제 네비게이션이 일어나지 않으므로, 고쳐지지 않았다면 이 시점에
    // "알 수 없는 문제가 발생했습니다" 오류 박스가 role="alert"로 영구히 남아 있었다.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('알 수 없는 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
    ).not.toBeInTheDocument();
  });

  it('삭제 실패(500)면 목록으로 이동하지 않는다 (D-77 — 500을 이미 삭제됨으로 해석하지 않는다).', async () => {
    server.use(
      errorHandler(
        'delete',
        `${TEST_API_BASE_URL}/items/:itemId`,
        500,
        errorBody('\nInvalid `prisma.item.delete()` invocation:\n... Record to delete does not exist.')
      )
    );

    renderDetailPage(String(mockTodoDetail.id));

    const deleteButton = await screen.findByRole('button', { name: '삭제하기' });
    fireEvent.click(deleteButton);

    await waitFor(() =>
      expect(
        screen.getByText('서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
      ).toBeInTheDocument()
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('메모 수정 후 저장에 성공하면 목록(/)으로 이동한다 (D-81).', async () => {
    server.use(
      http.patch(`${TEST_API_BASE_URL}/items/:itemId`, () =>
        HttpResponse.json({ ...mockTodoDetail, memo: '새 메모' })
      )
    );

    renderDetailPage(String(mockTodoDetail.id));

    const memoBox = await screen.findByPlaceholderText('메모를 입력해주세요');
    fireEvent.change(memoBox, { target: { value: '새 메모' } });

    fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('저장에 실패하면 목록으로 이동하지 않고 에러 배너가 뜬다.', async () => {
    server.use(
      errorHandler('patch', `${TEST_API_BASE_URL}/items/:itemId`, 400, errorBody('Validation Failed'))
    );

    renderDetailPage(String(mockTodoDetail.id));

    const memoBox = await screen.findByPlaceholderText('메모를 입력해주세요');
    fireEvent.change(memoBox, { target: { value: '새 메모' } });

    fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));

    await waitFor(() =>
      expect(screen.getByText('요청 형식이 올바르지 않습니다.')).toBeInTheDocument()
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
