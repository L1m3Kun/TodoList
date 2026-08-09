// @vitest-environment node
//
// jsdom의 File/Blob과 undici(Node 전역 fetch가 실제로 사용하는 구현체, msw/node도 같은
// 계열)의 File/Blob은 서로 다른 realm의 클래스라 jsdom 환경에서 만든 File을 FormData로
// 실어 보내면 본문이 유실된다(바이트 크기·파일명이 깨짐 — 로컬 실측 확인).
// 이 파일은 FormData가 실제로 실어 나르는 바이트를 검증하므로, fetch와 File 생성을
// 같은 undici 구현으로 맞추기 위해 node 환경으로 오버라이드한다.
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { uploadImage } from '@/lib/api/todoApi';
import { MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/validateImageFile';
import { TEST_API_BASE_URL, mockUploadImageResult } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

function createImageFile(sizeBytes: number, type = 'image/png'): File {
  return new File([new Uint8Array(sizeBytes)], 'photo.png', { type });
}

describe('uploadImage', () => {
  it('정상 경로 — UploadImageResult를 반환한다', async () => {
    const result = await uploadImage(createImageFile(1024));
    expect(result).toEqual(mockUploadImageResult);
  });

  it('FormData 필드명이 image다', async () => {
    let sentFormData: FormData | undefined;
    server.use(
      http.post(`${TEST_API_BASE_URL}/images/upload`, async ({ request }) => {
        sentFormData = await request.formData();
        return HttpResponse.json(mockUploadImageResult);
      }),
    );

    await uploadImage(createImageFile(1024));

    expect(sentFormData?.has('image')).toBe(true);
    const uploaded = sentFormData?.get('image') as File;
    expect(uploaded.name).toBe('photo.png');
    expect(uploaded.type).toBe('image/png');
    expect(uploaded.size).toBe(1024);
  });

  it('5MB 초과 File은 네트워크 요청 자체를 보내지 않는다(함정 5)', async () => {
    let callCount = 0;
    server.use(
      http.post(`${TEST_API_BASE_URL}/images/upload`, () => {
        callCount += 1;
        return HttpResponse.json(mockUploadImageResult);
      }),
    );

    await expect(uploadImage(createImageFile(MAX_IMAGE_SIZE_BYTES + 1))).rejects.toThrow();

    expect(callCount).toBe(0);
  });

  it('이미지가 아닌 MIME 타입도 네트워크 요청 없이 막는다', async () => {
    let callCount = 0;
    server.use(
      http.post(`${TEST_API_BASE_URL}/images/upload`, () => {
        callCount += 1;
        return HttpResponse.json(mockUploadImageResult);
      }),
    );

    await expect(uploadImage(createImageFile(1024, 'text/plain'))).rejects.toThrow();

    expect(callCount).toBe(0);
  });
});
