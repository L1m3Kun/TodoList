/**
 * 문자열 id가 통과할 수 있는 유일한 형태 — 앞자리 0·부호·공백·지수·16진수 표기를
 * 전부 거부한다(D-74). `Number()` 단독 변환은 `'0x10' → 16`, `'1e3' → 1000`,
 * `'  2  ' → 2`, `'+5' → 5`를 전부 통과시켜, 무인증 공용 테넌트에서 주소창 오타가
 * 조용히 남의 항목을 열어주는 실패를 만든다.
 */
const STRICT_TODO_ID_PATTERN = /^[1-9][0-9]*$/;

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
  if (typeof raw === 'string' && !STRICT_TODO_ID_PATTERN.test(raw)) {
    throw new Error(`Invalid todo id: ${JSON.stringify(raw)}`);
  }

  const value = typeof raw === 'string' ? Number(raw) : raw;

  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid todo id: ${JSON.stringify(raw)}`);
  }

  return value;
}

/**
 * `parseTodoId`의 던지지 않는 변형. 라우트 파라미터 검증은 렌더 경로에서 일어나므로,
 * throw 버전을 렌더 중 try/catch로 감싸는 대신 `null`을 돌려받아 분기하는 편이
 * 명확하다(D-74). `parse`/`safeParse` 쌍은 zod·`todoApi.parseOrThrow`가 이미 쓰는
 * 이 레포의 관용구를 따른다.
 */
export function safeParseTodoId(raw: string | number): number | null {
  try {
    return parseTodoId(raw);
  } catch {
    return null;
  }
}
