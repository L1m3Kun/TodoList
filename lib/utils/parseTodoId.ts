/**
 * 문자열 또는 숫자로 주어진 todo id를 검증된 양의 정수로 변환한다.
 *
 * 이 프로젝트의 API 응답 `id`는 항상 number이지만, 라우트 파라미터
 * (예: `/detail/[todoId]`)는 항상 string으로 들어온다. 호출부가 각자
 * `Number()`를 직접 쓰면 NaN 방어가 흩어지므로, 이 유틸 하나로 모은다.
 *
 * ⚠️ ST-3의 `ApiError` 계층과 결합하지 않는다 — 순환 의존을 피하기 위해
 * plain `Error`를 던진다. 호출부(향후 데이터 접근 훅)가 필요하면 감싼다.
 */
export function parseTodoId(raw: string | number): number {
  const value = typeof raw === 'string' ? Number(raw) : raw;

  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid todo id: ${JSON.stringify(raw)}`);
  }

  return value;
}
