import { useCallback, useRef, useState } from 'react';
import { ApiError, NetworkError, uploadImage } from '@lib/api';

/**
 * 이미지 업로드 훅. `uploadImage()`(lib/api/todoApi.ts)는 내부에서 `validateImageFile()`
 * (5MB/MIME 가드) 실패까지 `ValidationError`로 정규화해 던지므로(H-1), 이 훅이 받는 예외는
 * 항상 `ApiError`(NetworkError|HttpError|ValidationError) 하나의 계열이다 — `useTodoList`·
 * `useTodoDetail`과 동일한 에러 타입 계약을 갖는다.
 *
 * throw하지 않는다(D-61 — 형제 훅과 동일한 계약: 에러는 `error` state로, 성공 여부는
 * 반환값으로 알린다). 호출부가 매번 try/catch를 두지 않아도 되게 하는 것이 이 훅의
 * 존재 이유다.
 *
 * 세대(seq) 가드(M-3): `upload()`가 연속으로 호출되면 먼저 시작한 호출이 나중에 끝날 수
 * 있다. 세대 가드 없이 `finally`가 무조건 `isUploading=false`를 설정하면 늦게 끝난
 * 이전 호출이 "지금 진행 중인" 최신 호출의 완료 상태를 덮어쓰고, `error`도 뒤바뀐다.
 * `seqRef` 검사를 둬 자신이 가장 최근 호출일 때만 state를 갱신한다.
 *
 * 언마운트 여부는 검사하지 않는다 — React 18부터 언마운트된 컴포넌트에 대한 setState는
 * 경고 없는 무해한 no-op이라 마운트 추적 ref가 막을 문제가 없다. `seqRef`는 언마운트가
 * 아니라 "연속 호출 간 응답 순서 역전"을 막는 것이라 별개로 유지한다.
 */

interface UseImageUploadResult {
  isUploading: boolean;
  error: ApiError | null;
  upload: (file: File) => Promise<string | null>;
}

/** uploadImage()는 계약상 ApiError만 던지지만, 방어적으로 그 외 예외도 정규화한다. */
function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new NetworkError(error);
}

export function useImageUpload(): UseImageUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const seqRef = useRef(0);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    const mySeq = ++seqRef.current;
    const isCurrent = () => seqRef.current === mySeq;

    setIsUploading(true);
    try {
      const { url } = await uploadImage(file);
      if (isCurrent()) setError(null);
      return url;
    } catch (caught) {
      const apiError = toApiError(caught);
      if (isCurrent()) setError(apiError);
      return null;
    } finally {
      if (isCurrent()) setIsUploading(false);
    }
  }, []);

  return { isUploading, error, upload };
}
