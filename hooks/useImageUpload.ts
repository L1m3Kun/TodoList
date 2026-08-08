import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, uploadImage } from '@lib/api';

/**
 * 이미지 업로드 훅. `uploadImage()`(ST-4)는 내부에서 `validateImageFile()`(ST-2, 5MB/MIME
 * 가드)을 먼저 실행하므로, 이 훅이 받는 예외는 두 계열이다:
 *   1) `ApiError`(NetworkError|HttpError|ValidationError) — 네트워크·서버·응답 계약 실패
 *   2) plain `Error` — `validateImageFile`이 던지는 클라이언트 가드 실패(5MB 초과, 비이미지 MIME)
 * `instanceof ApiError`만 검사하면 (2)를 놓친다 — 이 훅은 `instanceof Error`로 두 계열을
 * 모두 잡아 `error`에 저장한다. 어느 경우든 throw하지 않는다: 호출부가 매번 try/catch를
 * 두지 않아도 되게 하는 것이 이 훅의 존재 이유다.
 */

interface UseImageUploadResult {
  isUploading: boolean;
  error: ApiError | Error | null;
  upload: (file: File) => Promise<string | null>;
}

export function useImageUpload(): UseImageUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const { url } = await uploadImage(file);
      if (isMountedRef.current) setError(null);
      return url;
    } catch (caught) {
      const normalized =
        caught instanceof Error ? caught : new Error(String(caught));
      if (isMountedRef.current) setError(normalized);
      return null;
    } finally {
      if (isMountedRef.current) setIsUploading(false);
    }
  }, []);

  return { isUploading, error, upload };
}
