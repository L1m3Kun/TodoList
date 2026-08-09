import type { ZodType } from 'zod';
import { getApiBaseUrl } from './config';
import { HttpError, NetworkError, ValidationError, type ApiErrorDetail } from './errors';

/** 서버 에러 바디의 실측 형태(D-53): `{ message, details? }`. `statusCode`·`error` 없음. */
interface RawErrorBody {
  message: string;
  details?: Record<string, ApiErrorDetail>;
}

/**
 * 저수준 API 요청 헬퍼. 모든 엔드포인트 함수(ST-4의 `lib/api/todoApi.ts`)가
 * 이 함수 하나로 위임한다 — URL 조립·에러 정규화·zod 파싱이 여기 한 곳에 모인다.
 *
 * ⚠️ 헤더를 강제하지 않는다. `init.headers`를 그대로 `fetch`에 전달할 뿐이다.
 * multipart(FormData) 업로드 시 `Content-Type`을 여기서 절대 설정하지 않는다
 * (설정하면 FormData의 자동 boundary 생성이 깨진다). JSON 바디를 보내는
 * 호출부는 스스로 `'Content-Type': 'application/json'` 헤더를 넣어야 한다.
 */
export async function request<T>(
  path: string,
  init: RequestInit,
  schema: ZodType<T>,
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetchOrThrow(url, init);

  if (!response.ok) {
    await throwHttpError(response);
  }

  return parseResponseBody(response, schema);
}

/** fetch 자체가 throw하면(오프라인, DNS 실패 등) NetworkError로 재포장한다. */
async function fetchOrThrow(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    throw new NetworkError(cause);
  }
}

/** 비-2xx 응답의 바디를 best-effort로 파싱해 HttpError로 던진다. */
async function throwHttpError(response: Response): Promise<never> {
  const body = await readErrorBodyBestEffort(response);
  const serverMessage = body?.message || response.statusText || `HTTP ${response.status}`;
  throw new HttpError(response.status, serverMessage, body?.details);
}

/** 에러 바디가 없거나 JSON이 아니면 null — 실패해도 다시 던지지 않는다. */
async function readErrorBodyBestEffort(response: Response): Promise<RawErrorBody | null> {
  try {
    const json: unknown = await response.json();
    return isRawErrorBody(json) ? json : null;
  } catch {
    return null;
  }
}

function isRawErrorBody(value: unknown): value is RawErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as { message?: unknown }).message === 'string';
}

/** 성공 응답을 zod로 검증한다. 파싱 실패는 ValidationError로 정규화한다. */
async function parseResponseBody<T>(response: Response, schema: ZodType<T>): Promise<T> {
  const json = await readJsonBestEffort(response);
  const result = schema.safeParse(json);

  if (!result.success) {
    throw new ValidationError(result.error);
  }

  return result.data;
}

/** 성공 응답인데 JSON이 아니면(빈 바디 등) undefined로 취급 — 뒤에서 zod가 실패시킨다. */
async function readJsonBestEffort(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
