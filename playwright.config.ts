import { config as loadEnv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

// `dotenv/config`의 기본 로드 대상은 `.env`뿐이라 `.env.local`을 못 읽는다.
// 프로젝트 실제 설정 파일인 `.env.local`을 명시적으로 지정해 로드한다.
loadEnv({ path: '.env.local' });

/**
 * E2E 전용 Playwright 설정.
 * - testDir: `e2e/`로 vitest(`test/**`)와 소유 디렉토리를 분리한다.
 * - webServer: `pnpm dev`(Next dev 서버)를 사용한다 — dev 모드에서만 뜨는
 *   React key/hydration/a11y 콘솔 경고를 잡아야 하므로 build+start가 아니다.
 * - `dotenv`로 `.env.local`을 로드해 `NEXT_PUBLIC_API_BASE_URL`을 확보한다.
 *   이 값은 e2e/mocks/todoApi.ts가 목킹 URL predicate에 사용한다.
 *   (하드코딩 금지 — architecture.standards 참조)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
