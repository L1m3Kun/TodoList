import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_SIZE_BYTES, validateImageFile } from '@lib/utils/validateImageFile';

/** jsdom 환경에서 지정한 바이트 크기의 File을 만든다(Blob 크기 조작). */
function createFileOfSize(sizeBytes: number, type: string): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], 'test-file', { type });
}

describe('validateImageFile', () => {
  it('정상 이미지 File은 통과한다(예외 없음)', () => {
    const file = createFileOfSize(1024, 'image/png');
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('5MB를 초과하는 File은 실패한다', () => {
    const file = createFileOfSize(MAX_IMAGE_SIZE_BYTES + 1, 'image/png');
    expect(() => validateImageFile(file)).toThrow();
  });

  it('5MB 경계값(정확히 MAX)은 통과한다', () => {
    const file = createFileOfSize(MAX_IMAGE_SIZE_BYTES, 'image/png');
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('비이미지 MIME 타입은 실패한다', () => {
    const file = createFileOfSize(1024, 'application/pdf');
    expect(() => validateImageFile(file)).toThrow();
  });
});
