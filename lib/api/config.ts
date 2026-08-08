/**
 * `NEXT_PUBLIC_API_BASE_URL`을 읽는다. 값은 이미 tenantId를 포함한다(D-48) —
 * 호출부(client.ts, todoApi.ts)는 tenantId를 별도로 조립하지 않는다.
 *
 * ⚠️ 반드시 함수 호출 시점에 `process.env`를 읽는다(모듈 최상단에서 읽지 않는다).
 * 그래야 테스트가 `vi.stubEnv`로 값을 바꿔가며 이 함수의 동작을 검증할 수 있다.
 *
 * env 미설정은 런타임 요청 실패가 아니라 **배포 설정 실수**이므로,
 * `ApiError` 3종(NetworkError|HttpError|ValidationError)에 포함하지 않고
 * 일반 `Error`를 즉시 던진다.
 */
export function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL이 설정되지 않았습니다. .env 파일 또는 배포 환경변수를 확인하세요.',
    );
  }

  return baseUrl;
}
