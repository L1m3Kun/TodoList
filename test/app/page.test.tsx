import { StrictMode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { http, HttpResponse } from 'msw';

import Home from '@/app/page';
import { TEST_API_BASE_URL, errorBody, mockTodoDetail } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

afterEach(cleanup);

/** GET /items 호출 횟수를 세면서 응답을 돌려주는 핸들러로 happy-path를 덮어쓴다. */
function mockList(items: { id: number; name: string; isCompleted: boolean }[]): {
  count: () => number;
} {
  let calls = 0;
  server.use(
    http.get(`${TEST_API_BASE_URL}/items`, () => {
      calls += 1;
      return HttpResponse.json(items);
    })
  );
  return { count: () => calls };
}

describe('Home (app/page.tsx)', () => {
  it('로딩 중엔 스켈레톤이 보이고 "할 일이 없어요"는 보이지 않는다', () => {
    mockList([]);
    const { container } = render(<Home />, { wrapper: StrictMode });

    // 로딩 상태는 fetch가 resolve되기 전 동기 렌더 시점에만 관찰 가능하다(useTodoList
    // 초기 state가 isLoading: true) — useTodoList.test.ts의 동일 패턴을 따른다.
    expect(screen.queryByText(/할 일이 없어요/)).not.toBeInTheDocument();
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
  });

  it('로드 후 서버가 준 name이 화면에 뜨고 isCompleted에 따라 TODO/DONE 섹션으로 갈린다', async () => {
    mockList([
      { id: 1, name: '장보기', isCompleted: false },
      { id: 2, name: '청소하기', isCompleted: true },
    ]);

    render(<Home />, { wrapper: StrictMode });

    await screen.findByText('장보기');
    expect(screen.getByText('청소하기')).toBeInTheDocument();

    // TodoItem은 isFinish에 따라 체크박스 aria-label을 '완료로 표시'/'완료 취소'로 나눈다.
    // 어댑터(isCompleted → isFinish)가 실제로 연결됐다는 증거다.
    expect(screen.getByRole('button', { name: '완료로 표시' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '완료 취소' })).toBeInTheDocument();
  });

  it('목록 로드 실패 시 에러 메시지와 다시 시도가 뜨고 클릭하면 GET이 한 번 더 나간다', async () => {
    let getCalls = 0;
    server.use(
      http.get(`${TEST_API_BASE_URL}/items`, () => {
        getCalls += 1;
        return HttpResponse.json(errorBody('Internal error'), { status: 500 });
      })
    );

    render(<Home />, { wrapper: StrictMode });

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: '다시 시도' });

    const callsBeforeRetry = getCalls;
    fireEvent.click(retryButton);

    await waitFor(() => expect(getCalls).toBeGreaterThan(callsBeforeRetry));
  });

  it('추가 폼 제출 시 POST 요청 바디가 { name: 입력값 }이고 이어서 GET이 다시 나간다', async () => {
    const list = mockList([]);
    let postBody: unknown = null;
    server.use(
      http.post(`${TEST_API_BASE_URL}/items`, async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ ...mockTodoDetail, id: 5, name: '빨래하기' });
      })
    );

    render(<Home />, { wrapper: StrictMode });
    await waitFor(() => expect(list.count()).toBeGreaterThanOrEqual(1));
    const callsBeforeAdd = list.count();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '빨래하기' } });
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }));

    await waitFor(() => expect(postBody).toEqual({ name: '빨래하기' }));
    await waitFor(() => expect(list.count()).toBeGreaterThan(callsBeforeAdd));
  });

  it('체크박스를 누르면 PATCH 바디가 { isCompleted: true }다', async () => {
    mockList([{ id: 1, name: '장보기', isCompleted: false }]);
    let patchBody: unknown = null;
    server.use(
      http.patch(`${TEST_API_BASE_URL}/items/:itemId`, async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ ...mockTodoDetail, id: 1, isCompleted: true });
      })
    );

    render(<Home />, { wrapper: StrictMode });
    await screen.findByText('장보기');

    fireEvent.click(screen.getByRole('button', { name: '완료로 표시' }));

    await waitFor(() => expect(patchBody).toEqual({ isCompleted: true }));
  });

  it('토글 후 refetch가 진행 중인 동안에도 스켈레톤 대신 기존 항목이 계속 보인다 (H-2 회귀)', async () => {
    // 초기 로드가 끝난 뒤에만 GET을 지연시킨다. toggleTodo 성공 → refetch() → 이 GET이
    // 나가고, useTodoList.fetchList()는 그 시작 지점에서 곧바로 isLoading:true를 세운다
    // (훅은 손대지 않는다, S-3). 그 pending 구간에서 페이지가 스켈레톤으로 갈아치우지
    // 않고 items를 유지하는지를 확인한다.
    let delayGet = false;
    const pendingGet: { release: (() => void) | null } = { release: null };
    server.use(
      http.get(`${TEST_API_BASE_URL}/items`, async () => {
        if (delayGet) {
          await new Promise<void>((resolve) => {
            pendingGet.release = resolve;
          });
        }
        return HttpResponse.json([{ id: 1, name: '장보기', isCompleted: false }]);
      }),
      http.patch(`${TEST_API_BASE_URL}/items/:itemId`, () =>
        HttpResponse.json({ ...mockTodoDetail, id: 1, name: '장보기', isCompleted: true })
      )
    );

    const { container } = render(<Home />, { wrapper: StrictMode });
    await screen.findByText('장보기');

    delayGet = true;
    fireEvent.click(screen.getByRole('button', { name: '완료로 표시' }));

    // refetch용 GET이 pendingGet.release로 붙잡혀 있을 때까지 기다린다 — 이 시점이 곧
    // useTodoList의 isLoading:true 구간이다.
    await waitFor(() => expect(pendingGet.release).not.toBeNull());

    expect(screen.getByText('장보기')).toBeInTheDocument();
    // TodoListSkeleton 행은 animate-pulse 클래스로 식별한다(체크박스 아이콘도 별개로
    // aria-hidden="true"를 쓰므로 그 속성만으로는 스켈레톤을 특정할 수 없다).
    expect(container.querySelectorAll('.animate-pulse').length).toBe(0);

    pendingGet.release?.();

    await waitFor(() => expect(screen.getByText('장보기')).toBeInTheDocument());
  });
});
