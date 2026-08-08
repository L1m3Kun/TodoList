import { http, HttpResponse } from 'msw';
import type {
  TodoSummaryDto,
  TodoDetailDto,
  DeleteResult,
  UploadImageResult,
} from '@/types/todo.dto';

/**
 * 테스트 전용 API base URL. vitest.config.mts의
 * `test.env.NEXT_PUBLIC_API_BASE_URL`과 반드시 동일한 값을 유지한다.
 * 값에는 이미 tenantId가 포함돼 있다(D-48) — 핸들러 경로에 tenantId를 별도로 넣지 않는다.
 */
export const TEST_API_BASE_URL = 'http://example.com/api/test-tenant';

/**
 * 목(mock) 데이터에 도메인 DTO 타입을 직접 붙인다(M-6). ST-0 시점엔 로컬 인터페이스로
 * 시작했으나(순환 의존 우려, 지금은 해소됨), 그 상태에서는 목이 계약과 어긋나도
 * `tsc`가 잡지 못했다 — 실제로 DTO 리네임 때 이 파일만 조용히 비껴간 사례가 있었다(D-64).
 * 도메인 타입을 직접 쓰면 목이 이탈하는 순간 컴파일 에러가 난다.
 */
export const mockTodoSummary: TodoSummaryDto = {
  id: 1,
  name: 'Mock todo',
  isCompleted: false,
};

export const mockTodoDetail: TodoDetailDto = {
  id: 1,
  tenantId: 'test-tenant',
  name: 'Mock todo',
  memo: null,
  imageUrl: null,
  isCompleted: false,
};

export const mockDeleteResult: DeleteResult = { message: 'Item deleted successfully' };

export const mockUploadImageResult: UploadImageResult = {
  url: `${TEST_API_BASE_URL}/mock-image.png`,
};

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
