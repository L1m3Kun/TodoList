/** 서버가 강제하는 이미지 업로드 상한(5MB). 클라이언트 가드에서 그대로 재사용한다. */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * 이미지 업로드 전 MIME 타입·용량을 검증한다.
 *
 * 서버가 5MB 상한을 강제하는데 클라이언트 가드가 없으면 사용자에게
 * 원인 불명 실패로 보인다(SERVICE.md 함정 5). 통과 시 반환값 없음,
 * 실패 시 `Error`를 던진다.
 */
export function validateImageFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error(`Invalid file type: ${file.type || 'unknown'} (expected image/*)`);
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(
      `Image file too large: ${file.size} bytes (max ${MAX_IMAGE_SIZE_BYTES} bytes)`,
    );
  }
}
