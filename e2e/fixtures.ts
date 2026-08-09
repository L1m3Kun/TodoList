import { test as base, expect, type ConsoleMessage } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

/**
 * 콘솔 경고/에러 수집 픽스처.
 *
 * dev 모드(next dev) 콘솔에 뜨는 React key·hydration·a11y 경고는 jsdom 기반
 * vitest로는 재현되지 않는다(D-84·D-87). 모든 e2e 테스트에 자동 적용(`auto: true`)해
 * 화이트리스트 밖 warning/error가 하나라도 찍히면 teardown에서 테스트를 실패시킨다.
 *
 * 모든 e2e spec은 `@playwright/test`가 아니라 **이 파일**에서 `test`/`expect`를
 * import해야 이 검증이 적용된다.
 */

/**
 * 알려진 무해 콘솔 메시지 화이트리스트.
 * 우리 코드와 무관한 dev 서버/프레임워크 자체 잡음만 여기 추가한다.
 * - React DevTools 설치 안내: 프로덕션 빌드엔 없는 dev 전용 안내성 로그.
 * - Fast Refresh 관련 로그: next dev의 HMR 자체 진단 메시지.
 */
const CONSOLE_WHITELIST_PATTERNS: readonly RegExp[] = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /Fast Refresh (had to perform a full reload|rebuilding)/i,
];

/**
 * 브라우저가 non-2xx 응답에 대해 자동 생성하는 네트워크 로그.
 *
 * 에러 상태 시나리오는 목킹으로 4xx/5xx를 **일부러** 만든다 — 그걸로 실패시키면
 * 테스트가 자기가 만든 조건에 자기가 걸리는 자기모순이 된다.
 *
 * ⚠️ 단, **목킹된 API origin에서 온 것만** 무시한다. 텍스트만 보고 전부 무시하면
 * 목을 벗어난 진짜 외부 요청 실패까지 삼켜, 누수가 초록 뒤에 숨는다
 * (실제로 그런 사고가 있었다 — `layout-regression`이 example.com에 실요청을 냈고
 * 그 404가 이 패턴에 삼켜져 15/15 초록으로 보였다).
 */
const NETWORK_STATUS_LOG = /^Failed to load resource: the server responded with a status of \d+/i;

function isExpectedMockedNetworkLog(msg: ConsoleMessage): boolean {
  if (!NETWORK_STATUS_LOG.test(msg.text())) return false;
  return msg.location().url.startsWith(API_ORIGIN);
}

function isWhitelistedConsoleMessage(text: string): boolean {
  return CONSOLE_WHITELIST_PATTERNS.some((pattern) => pattern.test(text));
}

function isTrackedConsoleType(type: string): boolean {
  return type === 'warning' || type === 'error';
}

/**
 * 실제 외부 API의 origin. 목이 어긋난 요청이 여기로 새는 것을 막는 데 쓴다.
 * 값이 없으면 가드를 조용히 끄는 대신 즉시 실패시킨다(설정 실수를 숨기지 않는다).
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL이 설정되어 있지 않습니다 (.env.local 확인).');
}
const API_ORIGIN = new URL(API_BASE_URL).origin;

type Fixtures = {
  /**
   * 자동 적용 픽스처(auto: true) — spec에서 직접 참조할 필요 없다.
   * 테스트 종료 시 화이트리스트 밖 콘솔 warning/error가 있으면 실패시킨다.
   */
  collectConsoleWarnings: void;
  /**
   * 자동 적용 픽스처(auto: true) — **외부로 나가는 모든 요청**을 차단하는 안전망.
   *
   * 목킹은 spec 본문에서 `page.route()`로 등록되고 Playwright는 라우트를 LIFO로 훑는다.
   * 이 가드는 픽스처 셋업 시점(= spec 본문보다 먼저) 등록되므로 **최후의 폴백**이 되어,
   * 어느 목에도 매칭되지 않은 요청만 여기로 떨어진다.
   *
   * 왜 필요한가: 목 URL predicate가 어긋나면 POST/PATCH/DELETE가 실제 공용 테넌트로 나간다.
   * 생성된 항목은 남고, 업로드한 이미지는 **삭제 API가 없어 영구 잔존**한다(D-84 제약).
   *
   * ⚠️ **API origin이 아니라 "로컬 dev 서버가 아닌 모든 곳"을 막는다(deny by default).**
   * 처음엔 API origin만 막았는데, 그 사이로 `example.com` 이미지 요청이 실제로 새어나갔고
   * 콘솔 화이트리스트에까지 삼켜져 **15/15 초록 뒤에 완전히 감춰졌다**. 막을 대상을
   * 열거하는 방식은 열거에서 빠진 것을 놓친다 — 허용할 것(localhost)만 통과시킨다.
   */
  blockExternalRequests: void;
};

/** 이 가드를 통과시킬 유일한 출처. 그 외 모든 origin은 테스트 결함으로 간주한다. */
function isLocalDevServer(origin: string): boolean {
  return origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000';
}

export const test = base.extend<Fixtures>({
  blockExternalRequests: [
    async ({ page }, use) => {
      const leakedRequests: string[] = [];

      await page.route(
        (url) => !isLocalDevServer(url.origin),
        async (route, request) => {
          leakedRequests.push(`${request.method()} ${request.url()}`);
          await route.abort();
        },
      );

      await use();

      // 목에 걸리지 않은 요청이 외부로 샜다면 실패한다.
      // (통과시키면 외부 테넌트에 되돌릴 수 없는 쓰기가 발생하거나,
      //  네트워크 상태에 따라 결과가 갈리는 테스트가 된다)
      expect(leakedRequests, '목킹되지 않은 외부 요청이 발생했다').toEqual([]);
    },
    { auto: true },
  ],
  collectConsoleWarnings: [
    async ({ page }, use) => {
      const unexpectedMessages: string[] = [];

      const handleConsole = (msg: ConsoleMessage) => {
        if (!isTrackedConsoleType(msg.type())) return;
        if (isWhitelistedConsoleMessage(msg.text())) return;
        if (isExpectedMockedNetworkLog(msg)) return;
        unexpectedMessages.push(`[${msg.type()}] ${msg.text()} @${msg.location().url}`);
      };

      page.on('console', handleConsole);
      await use();
      page.off('console', handleConsole);

      // 이 코드가 깨지면(예: React key/hydration 경고가 dev 콘솔에 새로 뜨면) 실패한다.
      expect(unexpectedMessages, '화이트리스트 밖 콘솔 warning/error 발생').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
