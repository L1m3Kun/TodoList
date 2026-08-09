import { config as loadEnv } from 'dotenv';
import type { Page, Route } from '@playwright/test';

// playwright.config.ts가 먼저 로드되지만, 이 모듈만 단독으로 import되는 경우
// (예: 유닛 테스트 도구)에도 안전하도록 `.env.local`을 자체적으로도 로드한다.
// dotenv는 이미 설정된 process.env 값을 덮어쓰지 않는다(override 기본값 false).
loadEnv({ path: '.env.local' });
import type {
  TodoSummaryDto,
  TodoDetailDto,
  DeleteResult,
  UploadImageResult,
} from '@/types/todo.dto';

/**
 * Todo API `page.route()` 목킹 헬퍼.
 *
 * URL 매칭은 glob 문자열이 아니라 predicate 함수를 쓴다 — `NEXT_PUBLIC_API_BASE_URL`
 * (테넌트 세그먼트 포함)에 특수문자가 섞여도 안전하게 매칭하기 위해서다
 * (architecture.standards — API 목킹 베이스 URL 하드코딩 금지).
 *
 * 매치는 되지만 method가 다른 요청은 `route.fallback()`으로 넘긴다 — 같은 URL(`/items`,
 * `/items/:id`)을 서로 다른 헬퍼(list/create, detail/update/delete)가 나눠 쓰므로,
 * 한 스펙에서 여러 헬퍼를 함께 등록해도 서로의 메서드를 가로채지 않는다.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    '[e2e/mocks/todoApi.ts] NEXT_PUBLIC_API_BASE_URL이 설정되어 있지 않습니다. .env.local을 확인하세요.',
  );
}

const ITEMS_URL = `${API_BASE_URL}/items`;
const IMAGE_UPLOAD_URL = `${API_BASE_URL}/images/upload`;

const DEFAULT_LIST_ERROR_MESSAGE = '목록을 불러오지 못했습니다.';
const DEFAULT_UPLOAD_ERROR_MESSAGE = '이미지 업로드에 실패했습니다.';
const DEFAULT_NOT_FOUND_MESSAGE = '요청한 항목을 찾을 수 없습니다.';
const DEFAULT_MOCK_IMAGE_URL = 'https://example.com/mock-uploaded-image.png';

function pathOf(url: URL): string {
  return url.href.split('?')[0];
}

/** GET/POST `/items` (목록 조회·생성). id 세그먼트가 없는 정확히 이 경로만 매칭한다. */
function isItemsCollectionUrl(url: URL): boolean {
  return pathOf(url) === ITEMS_URL;
}

/** GET/PATCH/DELETE `/items/{id}`. id 생략 시 임의 id 모두, 지정 시 해당 id만 매칭한다. */
function isItemDetailUrl(url: URL, id?: number): boolean {
  const path = pathOf(url);
  if (!path.startsWith(`${ITEMS_URL}/`)) return false;
  return id === undefined || path === `${ITEMS_URL}/${id}`;
}

function isImageUploadUrl(url: URL): boolean {
  return pathOf(url) === IMAGE_UPLOAD_URL;
}

/** `/items/{id}` 경로 끝 세그먼트에서 id를 뽑는다. */
function extractItemId(url: URL): number {
  const segments = pathOf(url).split('/');
  return Number(segments[segments.length - 1]);
}

async function wait(ms: number): Promise<void> {
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** opts.status가 없으면 요청을 다른 핸들러로 넘긴다(method 불일치 등 공용 가드). */
async function guardMethod(route: Route, method: string): Promise<boolean> {
  if (route.request().method() === method) return true;
  await route.fallback();
  return false;
}

export interface MockDelayOptions {
  /** 응답 전 인위적 지연(ms). 로딩·업로드중 상태 재현에 쓴다. */
  delayMs?: number;
}

export interface MockErrorBody {
  message: string;
}

export interface MockTodoListOptions extends MockDelayOptions {
  /** 기본 200. 4xx/5xx를 주면 items 대신 errorBody를 응답한다. */
  status?: number;
  errorBody?: MockErrorBody;
}

/** GET `/items` 목록 응답을 목킹한다. status>=400이면 실패 응답(errorBody)을 준다. */
export async function mockTodoList(
  page: Page,
  items: TodoSummaryDto[],
  opts: MockTodoListOptions = {},
): Promise<void> {
  const { status = 200, delayMs = 0, errorBody } = opts;
  await page.route(isItemsCollectionUrl, async (route) => {
    if (!(await guardMethod(route, 'GET'))) return;
    await wait(delayMs);
    const body = status >= 400 ? (errorBody ?? { message: DEFAULT_LIST_ERROR_MESSAGE }) : items;
    await fulfillJson(route, status, body);
  });
}

export type MockTodoDetailResult = TodoDetailDto | 'not-found';

export interface MockTodoDetailOptions extends MockDelayOptions {
  /** 기본값: 성공이면 200, 'not-found'면 404. */
  status?: number;
}

/** GET `/items/{id}` 상세 응답을 목킹한다. `'not-found'`를 주면 404 응답을 만든다. */
export async function mockTodoDetail(
  page: Page,
  id: number,
  result: MockTodoDetailResult,
  opts: MockTodoDetailOptions = {},
): Promise<void> {
  const { delayMs = 0 } = opts;
  await page.route(
    (url) => isItemDetailUrl(url, id),
    async (route) => {
      if (!(await guardMethod(route, 'GET'))) return;
      await wait(delayMs);
      if (result === 'not-found') {
        await fulfillJson(route, opts.status ?? 404, { message: DEFAULT_NOT_FOUND_MESSAGE });
        return;
      }
      await fulfillJson(route, opts.status ?? 200, result);
    },
  );
}

export interface MockResponse<T> extends MockDelayOptions {
  /** 기본 200. */
  status?: number;
  body: T;
}

export type MockCreateTodoHandler = (
  requestBody: { name: string },
) => MockResponse<TodoDetailDto | MockErrorBody>;

/** POST `/items` 생성 응답을 목킹한다. 요청 바디를 받아 응답을 결정하는 handler를 넘긴다. */
export async function mockCreateTodo(page: Page, handler: MockCreateTodoHandler): Promise<void> {
  await page.route(isItemsCollectionUrl, async (route) => {
    if (!(await guardMethod(route, 'POST'))) return;
    const requestBody = route.request().postDataJSON() as { name: string };
    const response = handler(requestBody);
    await wait(response.delayMs ?? 0);
    await fulfillJson(route, response.status ?? 200, response.body);
  });
}

export type MockUpdateRequestBody = {
  name?: string;
  memo?: string;
  imageUrl?: string;
  isCompleted?: boolean;
};

export type MockUpdateTodoHandler = (
  id: number,
  requestBody: MockUpdateRequestBody,
) => MockResponse<TodoDetailDto | MockErrorBody>;

/** PATCH `/items/{id}` 수정 응답을 목킹한다. id·요청 바디를 받는 handler를 넘긴다. */
export async function mockUpdateTodo(page: Page, handler: MockUpdateTodoHandler): Promise<void> {
  await page.route(
    (url) => isItemDetailUrl(url),
    async (route) => {
      if (!(await guardMethod(route, 'PATCH'))) return;
      const url = new URL(route.request().url());
      const requestBody = route.request().postDataJSON() as MockUpdateRequestBody;
      const response = handler(extractItemId(url), requestBody);
      await wait(response.delayMs ?? 0);
      await fulfillJson(route, response.status ?? 200, response.body);
    },
  );
}

export type MockDeleteTodoHandler = (id: number) => MockResponse<DeleteResult | MockErrorBody>;

/** DELETE `/items/{id}` 삭제 응답을 목킹한다. id를 받는 handler를 넘긴다. */
export async function mockDeleteTodo(page: Page, handler: MockDeleteTodoHandler): Promise<void> {
  await page.route(
    (url) => isItemDetailUrl(url),
    async (route) => {
      if (!(await guardMethod(route, 'DELETE'))) return;
      const url = new URL(route.request().url());
      const response = handler(extractItemId(url));
      await wait(response.delayMs ?? 0);
      await fulfillJson(route, response.status ?? 200, response.body);
    },
  );
}

export interface MockImageUploadOptions extends MockDelayOptions {
  /** 기본 200. */
  status?: number;
  /** 성공 시 응답할 url. 기본값은 임의의 예시 URL. */
  url?: string;
  /** status>=400일 때 응답할 바디. */
  errorBody?: MockErrorBody;
}

/** POST `/images/upload` 응답을 목킹한다(성공 시 `{url}`, 실패 시 errorBody). */
export async function mockImageUpload(
  page: Page,
  opts: MockImageUploadOptions = {},
): Promise<void> {
  const { status = 200, delayMs = 0, url = DEFAULT_MOCK_IMAGE_URL, errorBody } = opts;
  await page.route(isImageUploadUrl, async (route) => {
    if (!(await guardMethod(route, 'POST'))) return;
    await wait(delayMs);
    const body: UploadImageResult | MockErrorBody =
      status >= 400 ? (errorBody ?? { message: DEFAULT_UPLOAD_ERROR_MESSAGE }) : { url };
    await fulfillJson(route, status, body);
  });
}
