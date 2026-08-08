import type { ZodError } from 'zod';

/** ApiError 3종을 구분하는 태그. */
export type ApiErrorKind = 'network' | 'http' | 'validation';

/** HttpError.details의 필드 단위 항목 (서버 실측 형태, D-53). */
export interface ApiErrorDetail {
  message: string;
  value?: unknown;
}

/**
 * 모든 API 실패의 베이스 클래스.
 * `request()`(client.ts)는 NetworkError | HttpError | ValidationError
 * 3종 외의 예외를 던지지 않는다(설정 오류인 getApiBaseUrl()의 Error는 예외).
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.kind = kind;
    this.name = this.constructor.name;
  }
}

/** fetch 자체가 실패했을 때(오프라인, DNS 실패, MSW `HttpResponse.error()` 등). */
export class NetworkError extends ApiError {
  constructor(cause: unknown) {
    super('network', '네트워크 요청에 실패했습니다. 연결 상태를 확인해주세요.', { cause });
  }
}

/**
 * 비-2xx HTTP 응답.
 *
 * `message`(Error 표준 필드)는 상태코드 기반으로 매핑한 **안전한 사용자 표시 문구**다.
 * 서버가 실제로 보낸 원문(D-53 실측: DELETE 500에서 원시 Prisma 스택 메시지가 그대로
 * 새는 사례 확인)은 `serverMessage`에 그대로 보존한다 — 로깅·디버깅 전용이며
 * 화면에 그대로 노출하지 않는다. `details`는 필드별 검증 실패 정보(있는 경우)로,
 * 폼 에러 표시에 쓸 수 있도록 파싱해 보존한다.
 */
export class HttpError extends ApiError {
  readonly status: number;
  readonly serverMessage: string;
  readonly details?: Record<string, ApiErrorDetail>;

  constructor(status: number, serverMessage: string, details?: Record<string, ApiErrorDetail>) {
    super('http', mapStatusToUserMessage(status));
    this.status = status;
    this.serverMessage = serverMessage;
    this.details = details;
  }
}

/**
 * 성공(2xx) 응답이 zod 계약과 어긋날 때. 서버가 계약과 다른 필드를 반환하거나,
 * 업로드 전 클라이언트 가드 등 다른 런타임 검증이 실패했을 때도 사용한다.
 */
export class ValidationError extends ApiError {
  constructor(cause: ZodError) {
    super('validation', '서버 응답이 예상한 형식과 다릅니다.', { cause });
  }
}

/**
 * 상태코드 → 사람이 읽을 안전한 문구.
 * 서버 원문(serverMessage)을 그대로 노출하면 500 DELETE 케이스처럼
 * 원시 Prisma 에러 스택이 사용자에게 새어나간다(D-53). 500대를 "서버 장애"로
 * 단정하지 않는다 — 삭제 경로의 500은 "이미 없는 항목"일 수 있으므로,
 * 문구도 재시도를 권하는 중립적인 표현으로 둔다. status는 HttpError.status에
 * 그대로 보존되므로 호출부가 필요하면 status로 직접 분기할 수 있다.
 */
function mapStatusToUserMessage(status: number): string {
  if (status === 400) return '요청 형식이 올바르지 않습니다.';
  if (status === 404) return '요청한 항목을 찾을 수 없습니다.';
  if (status === 409) return '요청이 현재 상태와 충돌합니다.';
  if (status >= 400 && status < 500) return '요청을 처리할 수 없습니다.';
  if (status >= 500) return '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
  return '요청을 처리하는 중 알 수 없는 문제가 발생했습니다.';
}
