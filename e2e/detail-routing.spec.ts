import { config as loadEnv } from 'dotenv';

// e2e/mocks/todoApi.ts와 동일한 방어적 로드 패턴(ST-1 계약) — playwright.config.ts가
// 먼저 .env.local을 로드하지만, 이 spec이 워커 프로세스에서 독립적으로 평가될 가능성에
// 대비해 자체적으로도 로드한다. dotenv는 override:false가 기본값이라 이미 설정된
// process.env 값을 덮어쓰지 않으므로 두 번 로드해도 안전하다.
loadEnv({ path: '.env.local' });

import { test, expect } from './fixtures';
import { mockTodoDetail } from './mocks/todoApi';
import { appAlert } from './selectors';
import type { TodoDetailDto } from '@/types/todo.dto';

/**
 * ST-2 — D-84 미검증 ①(`use(params)` Suspense 경로, 이번 실행 최우선 항목) +
 * D-84 미검증 ③의 '404'·'잘못된 URL' 상태를 함께 검증한다(같은 라우트 진입 코드경로라
 * plan.json 결정대로 별도 파일을 만들지 않고 여기 흡수한다).
 *
 * (a) 유효 id 하드 네비게이션(page.goto): 최초 SSR/hydration부터 `use(params)`가 실제로
 *     커밋되어 TodoDetailEditor가 렌더되는지.
 * (b) `safeParseTodoId`가 거부해야 하는 포맷: 에러 카드 렌더 + detail GET 0회 호출.
 * (c) GET detail 404: `error.message`(상태코드 기반 안전 문구)가 그대로 렌더되는지(S-4).
 *
 * 모든 네트워크는 `e2e/mocks/todoApi.ts` 공유 헬퍼로 목킹한다(architecture.standards).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    '[e2e/detail-routing.spec.ts] NEXT_PUBLIC_API_BASE_URL이 설정되어 있지 않습니다. .env.local을 확인하세요.',
  );
}

const ITEMS_URL = `${API_BASE_URL}/items`;

/**
 * `/items/{id}` 상세 조회 요청인지 판별한다(e2e/mocks/todoApi.ts의 isItemDetailUrl과
 * 동일한 판정 기준 — id 세그먼트가 있는 경로만 매칭, `/items` 자체는 제외).
 */
function isItemDetailRequestUrl(url: string): boolean {
  return url.startsWith(`${ITEMS_URL}/`);
}

test.describe('상세 페이지 라우팅 — use(params) 커밋 + 404/잘못된 URL', () => {
  test('유효한 id로 하드 네비게이션하면 use(params) 경로가 커밋되어 상세 데이터가 보인다', async ({
    page,
  }) => {
    const detail: TodoDetailDto = {
      id: 42,
      tenantId: 'e2e-tenant',
      name: 'ST-2 라우팅 검증용 할 일',
      memo: 'use(params) 커밋 확인용 메모',
      imageUrl: null,
      isCompleted: false,
    };
    await mockTodoDetail(page, 42, detail);

    // page.goto — 클라이언트 내비게이션(router.push)이 아니라 브라우저 주소창 진입과
    // 동일하게 최초 SSR/hydration부터 시작한다. use(params)가 이 경로를 타지 않으면
    // 아래 단언들이 검증할 화면 자체가 나타나지 않는다.
    await page.goto('/detail/42');

    // use(params)/Suspense 재시도가 실제 브라우저 DOM에 커밋되지 않는 회귀가 생기면
    // (D-82가 jsdom에서 발견한 문제가 프로덕션 빌드/브라우저에도 있었다면)
    // TodoDetailEditor가 렌더되지 않아 이 버튼(TodoItemDetail, 접근 가능한 이름 = todo
    // 텍스트)이 나타나지 않고 로딩 상태에 머물다 타임아웃으로 실패한다.
    await expect(page.getByRole('button', { name: detail.name })).toBeVisible();

    // toTodoDetail 어댑터(dto.memo → draft.memo)나 TodoMemoBox의 value 바인딩이 깨지면
    // textarea 값이 비거나 다른 텍스트가 들어가 실패한다.
    await expect(page.getByRole('textbox', { name: 'Memo' })).toHaveValue(detail.memo ?? '');
  });

  // ⚠️ '+5'를 쓰면 안 된다(QA 변이 테스트 실측). Next는 이 라우트 파라미터를
  // '+5'가 아니라 리터럴 '%2B5'로 전달한다. 그러면 STRICT_TODO_ID_PATTERN을
  // **통째로 지워도** Number('%2B5')가 NaN이라 여전히 거부되므로, 정규식이 무엇이든
  // 테스트가 통과한다 — 아무것도 증명하지 못하는 단언이 된다(D-58·D-67·D-85와 같은 유형).
  // 대신 '0x10'을 쓴다: 느슨한 변환에서 Number('0x10')===16으로 **통과해버리는** 값이라(D-81),
  // 정규식이 느슨해지면 엉뚱한 항목(id=16) 조회 요청이 나가 이 테스트가 실패한다.
  const invalidIds = ['1e3', '0x10', 'abc'];

  for (const invalidId of invalidIds) {
    test(`잘못된 id 형식(${invalidId})은 에러를 렌더하고 detail GET을 호출하지 않는다`, async ({
      page,
    }) => {
      const detailRequestUrls: string[] = [];
      page.on('request', (request) => {
        if (isItemDetailRequestUrl(request.url())) detailRequestUrls.push(request.url());
      });

      // 이 id들은 detail GET을 목킹하지 않는다 — safeParseTodoId가 정상 동작한다면
      // TodoDetailView 자체가 마운트되지 않으므로 목킹할 요청이 애초에 없어야 한다.
      await page.goto(`/detail/${invalidId}`);

      const alert = appAlert(page);
      // safeParseTodoId가 이 포맷을 거부하지 못하면(STRICT_TODO_ID_PATTERN이 느슨해지면)
      // id===null 분기 대신 TodoDetailView가 마운트되어 로딩/상세 화면이 뜨므로
      // role="alert"가 아예 나타나지 않아 이 단언이 실패한다.
      await expect(alert).toBeVisible();
      await expect(alert).toContainText('잘못된 주소입니다.');

      // STRICT_TODO_ID_PATTERN이 느슨해져 이 문자열(Number() 강제 변환에서
      // '1e3'→1000, '0x10'→16으로 **통과해버리는** 값들)을 받아들이면 TodoDetailView가
      // 마운트되고 useTodoDetail이 GET /items/{id}를 호출한다 — 그 경우 이 배열이
      // 비어있지 않아 실패한다. 정규식을 `/.*/`로 바꿔 실제 실패를 확인했다(변이 검증).
      // ('abc'는 어떤 정규식이든 Number()가 NaN이라 변이에 둔감하다 — 정규식 검증이
      //  아니라 "평범하게 잘못된 주소" 경로를 지키는 케이스로 남겨둔다.)
      expect(detailRequestUrls).toEqual([]);
    });
  }

  test('상세 GET이 404를 응답하면 매핑된 안전 메시지를 그대로 에러로 렌더한다', async ({ page }) => {
    // 'not-found' 쇼트컷은 e2e/mocks/todoApi.ts의 DEFAULT_NOT_FOUND_MESSAGE
    // ('요청한 항목을 찾을 수 없습니다.')를 서버 응답 message로 준다. lib/api/client.ts는
    // 이 값을 HttpError.serverMessage로 보존하고, HttpError.message(Error 표준 필드,
    // 화면에 실제로 쓰이는 값)는 lib/api/errors.ts의 mapStatusToUserMessage(404)가 만드는
    // 별도의 "안전 문구"다. 두 값이 이 케이스에서는 같은 문자열이지만(D-53 — 실제 서버 404
    // 문구를 반영하도록 설계됨) 값의 출처(생성 지점)는 다르다.
    await mockTodoDetail(page, 999, 'not-found');

    await page.goto('/detail/999');

    const alert = appAlert(page);
    // page.tsx의 !detail 분기가 error.message 대신 다른 문자열(UNEXPECTED_ERROR_TITLE
    // 폴백, 다른 상태코드 매핑 문구, 원시 JSON 등)을 쓰면 텍스트가 달라져 실패한다.
    // 주의(불확실한 지점, result-ST-2.md 참조): 이 404 케이스는 DEFAULT_NOT_FOUND_MESSAGE와
    // mapStatusToUserMessage(404)가 문자열까지 동일해, "message 대신 serverMessage를
    // 노출"하는 아주 좁은 회귀만은 이 단언 하나로 구분하지 못한다.
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText('요청한 항목을 찾을 수 없습니다.');
  });
});
