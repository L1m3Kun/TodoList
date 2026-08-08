import type { ZodType } from 'zod';
import { request } from './client';
import { ValidationError } from './errors';
import { validateImageFile } from '@/lib/utils/validateImageFile';
import {
  todoSummaryListSchema,
  todoDetailSchema,
  createTodoInputSchema,
  updateTodoInputSchema,
  deleteResultSchema,
  uploadImageResultSchema,
} from '@/types/schemas/todo.schema';
import type {
  TodoSummaryDto,
  TodoDetailDto,
  CreateTodoInput,
  UpdateTodoInput,
  DeleteResult,
  UploadImageResult,
} from '@/types/todo.dto';

/**
 * Todo API 엔드포인트 함수 6종. 전부 `lib/api/client.ts`의 `request<T>()`에 위임한다
 * (URL 조립·에러 정규화·zod 파싱은 client.ts 한 곳에만 있다).
 *
 * id를 받는 함수(getTodo/updateTodo/deleteTodo)는 호출부가 이미
 * `lib/utils/parseTodoId.ts`를 거친 검증된 number를 넘긴다고 가정한다 —
 * 문자열→number 변환은 이 계층의 책임이 아니다.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

/**
 * 전송 전 요청 바디를 zod로 검증한다. 실패 시 원시 ZodError를 던지지 않고
 * `ValidationError`로 정규화해, 이 파일의 모든 함수가 `NetworkError`|`HttpError`|
 * `ValidationError` 3종 외의 예외를 던지지 않는다는 프로젝트 표준을 지킨다.
 */
function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(result.error);
  return result.data;
}

/** page/pageSize가 주어진 것만 쿼리스트링에 포함한다. */
function buildTodosQueryString(params?: {
  page?: number;
  pageSize?: number;
}): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.pageSize !== undefined)
    search.set('pageSize', String(params.pageSize));
  const query = search.toString();
  return query ? `?${query}` : '';
}

/**
 * GET /items — page/pageSize를 생략하면 쿼리스트링을 붙이지 않아 서버 기본값(1/10)에
 * 위임한다. 클라이언트가 기본값을 재정의하지 않는다.
 */
export async function getTodos(params?: {
  page?: number;
  pageSize?: number;
}): Promise<TodoSummaryDto[]> {
  const qs = buildTodosQueryString(params);
  return request(`/items${qs}`, { method: 'GET' }, todoSummaryListSchema);
}

/** POST /items */
export async function createTodo(input: CreateTodoInput): Promise<TodoDetailDto> {
  const body = parseOrThrow(createTodoInputSchema, input);
  return request(
    '/items',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    todoDetailSchema
  );
}

/** GET /items/:id */
export async function getTodo(id: number): Promise<TodoDetailDto> {
  return request(`/items/${id}`, { method: 'GET' }, todoDetailSchema);
}

/** PATCH /items/:id */
export async function updateTodo(
  id: number,
  patch: UpdateTodoInput
): Promise<TodoDetailDto> {
  const body = parseOrThrow(updateTodoInputSchema, patch);
  return request(
    `/items/${id}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    todoDetailSchema
  );
}

/** DELETE /items/:id */
export async function deleteTodo(id: number): Promise<DeleteResult> {
  return request(`/items/${id}`, { method: 'DELETE' }, deleteResultSchema);
}

/**
 * POST /images/upload — 네트워크 호출 전 `validateImageFile`(5MB·MIME 가드)을 반드시 거친다
 * (SERVICE.md 함정 5: 서버 5MB 상한을 클라이언트가 먼저 막지 않으면 원인 불명 실패로 보인다).
 * FormData 필드명은 반드시 `'image'`. `headers`는 넘기지 않는다 — FormData의 자동
 * boundary 생성을 유지하기 위해 Content-Type을 수동 설정하지 않는다.
 */
export async function uploadImage(file: File): Promise<UploadImageResult> {
  validateImageFile(file);
  const formData = new FormData();
  formData.append('image', file);
  return request(
    '/images/upload',
    { method: 'POST', body: formData },
    uploadImageResultSchema
  );
}
