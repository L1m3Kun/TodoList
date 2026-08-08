import { http, HttpResponse } from 'msw';

/**
 * 테스트 전용 API base URL. vitest.config.mts의
 * `test.env.NEXT_PUBLIC_API_BASE_URL`과 반드시 동일한 값을 유지한다.
 * 값에는 이미 tenantId가 포함돼 있다(D-48) — 핸들러 경로에 tenantId를 별도로 넣지 않는다.
 */
export const TEST_API_BASE_URL = 'http://example.com/api/test-tenant';

/**
 * 목록 응답 형태 (api-spec.json FindAll) — memo/imageUrl 없음(함정 1).
 * lib/api/todoApi.ts(ST-4)가 아직 없으므로 도메인 타입을 import하지 않고
 * 스펙 필드를 직접 리터럴로 정의한다(ST-0은 ST-1보다 먼저 실행됨).
 */
export interface MockTodoSummary {
  id: number;
  name: string;
  isCompleted: boolean;
}

/** 상세 응답 형태 (api-spec.json Item / FindOne / Update) */
export interface MockTodoDetail {
  id: number;
  tenantId: string;
  name: string;
  memo: string | null;
  imageUrl: string | null;
  isCompleted: boolean;
}

export const mockTodoSummary: MockTodoSummary = {
  id: 1,
  name: 'Mock todo',
  isCompleted: false,
};

export const mockTodoDetail: MockTodoDetail = {
  id: 1,
  tenantId: 'test-tenant',
  name: 'Mock todo',
  memo: null,
  imageUrl: null,
  isCompleted: false,
};

export const mockDeleteResult = { message: 'Item deleted successfully' };

export const mockUploadImageResult = { url: `${TEST_API_BASE_URL}/mock-image.png` };

/**
 * 실측된(D-53, 오케스트레이터 실측) 서버 에러 바디 형태.
 * plan.json의 NestJS 가정({statusCode, message, error})은 틀렸다 — statusCode/error 필드 없음.
 * 형태: { message: string, details?: Record<string, { message: string, value?: unknown }> }
 */
export interface ApiErrorDetail {
  message: string;
  value?: unknown;
}

export interface ApiErrorBody {
  message: string;
  details?: Record<string, ApiErrorDetail>;
}

/** 재사용 가능한 에러 바디 빌더. 테스트가 매번 형태를 새로 지어내지 않게 한다. */
export function errorBody(message: string, details?: Record<string, ApiErrorDetail>): ApiErrorBody {
  return details ? { message, details } : { message };
}

type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

/**
 * 에러 케이스 핸들러 팩토리. 각 테스트가 `server.use(...)`로 happy-path를 덮어써
 * 실패 응답을 시뮬레이션할 때 사용한다.
 *
 * 사용 예:
 * server.use(
 *   errorHandler('get', `${TEST_API_BASE_URL}/items/:itemId`, 404,
 *     errorBody('Item with ID 999999 not found for tenant limekun')),
 * );
 */
export function errorHandler(method: HttpMethod, url: string, status: number, body: ApiErrorBody) {
  return http[method](url, () => HttpResponse.json(body, { status }));
}

export const handlers = [
  http.get(`${TEST_API_BASE_URL}/items`, () => {
    return HttpResponse.json([mockTodoSummary]);
  }),
  http.post(`${TEST_API_BASE_URL}/items`, () => {
    return HttpResponse.json(mockTodoDetail);
  }),
  http.get(`${TEST_API_BASE_URL}/items/:itemId`, () => {
    return HttpResponse.json(mockTodoDetail);
  }),
  http.patch(`${TEST_API_BASE_URL}/items/:itemId`, () => {
    return HttpResponse.json(mockTodoDetail);
  }),
  http.delete(`${TEST_API_BASE_URL}/items/:itemId`, () => {
    return HttpResponse.json(mockDeleteResult);
  }),
  http.post(`${TEST_API_BASE_URL}/images/upload`, () => {
    return HttpResponse.json(mockUploadImageResult);
  }),
];
