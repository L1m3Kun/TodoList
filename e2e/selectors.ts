import type { Locator, Page } from '@playwright/test';

/**
 * e2e 공용 셀렉터 규약.
 *
 * 왜 필요한가: Next.js App Router는 페이지마다 `<div role="alert" aria-live="assertive"
 * id="__next-route-announcer__">`(내용 없는 라우트 안내용 live region)를 **항상** 렌더한다.
 * 그래서 `page.getByRole('alert')`는 앱의 `StatusMessage`와 함께 **2개**로 잡혀
 * strict mode 위반이 난다. 실제로 spec 5개를 각자 작성한 결과 4개가 동일하게 이 함정을 밟았다.
 *
 * 개별 spec에서 매번 우회하지 말고 여기 헬퍼를 쓴다.
 */

const NEXT_ROUTE_ANNOUNCER_ID = '__next-route-announcer__';

/**
 * 앱이 렌더한 에러 `StatusMessage`(role="alert"). Next 라우트 어나운서는 제외한다.
 * @see components/status/StatusMessage.tsx — tone='error'일 때 role="alert"
 */
function appAlert(page: Page): Locator {
  return page.locator(`[role="alert"]:not(#${NEXT_ROUTE_ANNOUNCER_ID})`);
}

/**
 * 앱이 렌더한 `role="status"` 영역 중 텍스트로 특정한 것.
 *
 * `getByRole('status', { name })`은 쓰지 마라 — role="status"의 accessible name은
 * author 지정(aria-label/labelledby) 전용이라 본문 텍스트로는 매칭되지 않는다.
 * 로딩 `StatusMessage`와 업로드 오버레이가 둘 다 role="status"라 텍스트 구분이 필요하다.
 */
function appStatus(page: Page, text: string | RegExp): Locator {
  return page.getByRole('status').filter({ hasText: text });
}

export { appAlert, appStatus };
