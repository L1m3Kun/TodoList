// 이 테스트는 `renderHook`(DOM 필요)을 쓰므로 jsdom 환경(vitest.config.mts 기본값)을 그대로 쓴다.
// ST-4의 `todoApi.upload.test.ts`는 FormData가 실제로 실어 나르는 *바이트*(필드명·파일명·크기)를
// 검증하기 때문에 jsdom File과 undici(Node fetch) File의 realm 불일치 문제를 피하려고
// 파일 상단에 환경 오버라이드 지시어(node 환경 고정)를 달아뒀다. 이 테스트 파일은 그 문제와 무관하다
// (주의: 아래 이유 때문에 이 파일에는 그 지시어를 쓰지 않는다 — 문자열이 파일 어디에 있든 Vitest가
// 이를 파싱해 이 파일 전체를 node 환경으로 바꿔버리고, 그러면 renderHook이 요구하는 document가 사라진다):
//   - 정상 업로드 케이스는 응답 바디(url)만 확인한다 — happy-path MSW 핸들러는 요청 바디를
//     들여다보지 않고 URL/메서드로만 매칭하므로, 전송된 바이트가 깨지더라도 매칭·응답에는
//     영향이 없다(필드명·바이트 무결성은 이미 ST-4가 node 환경에서 검증했다 — 여기서 중복 검증하지 않는다).
//   - 5MB 초과·비이미지 MIME 케이스는 `validateImageFile`이 fetch 이전에 막아 네트워크 자체가
//     발생하지 않으므로 File 구현체 차이가 개입할 여지가 없다.
//   - 서버 에러 케이스도 상태 코드·에러 바디만 확인하므로 전송 바이트와 무관하다.
// 따라서 이 훅 레벨 테스트는 jsdom 환경을 유지하는 것이 `renderHook` 요구사항과 상충하지 않는다.
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { useImageUpload } from '@hooks/useImageUpload';
import { ApiError, HttpError, ValidationError } from '@lib/api';
import { MAX_IMAGE_SIZE_BYTES } from '@lib/utils';

import {
  TEST_API_BASE_URL,
  errorBody,
  errorHandler,
  mockUploadImageResult,
} from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

function createImageFile(sizeBytes: number, type = 'image/png'): File {
  return new File([new Uint8Array(sizeBytes)], 'photo.png', { type });
}

/** `/images/upload` 호출 횟수를 세는 핸들러로 happy-path를 덮어쓴다. */
function countUploadCalls(): { count: () => number } {
  let calls = 0;
  server.use(
    http.post(`${TEST_API_BASE_URL}/images/upload`, () => {
      calls += 1;
      return HttpResponse.json(mockUploadImageResult);
    })
  );
  return { count: () => calls };
}

/** 테스트가 원하는 시점에 응답을 풀어주는 게이트. M-3 세대 가드 검증에 쓴다. */
function createGate(): { wait: () => Promise<void>; release: () => void } {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait: () => promise, release: () => release() };
}

describe('useImageUpload', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('정상 업로드 — url을 반환하고 isUploading이 true→false로 전이한다', async () => {
    const { result } = renderHook(() => useImageUpload());
    let uploadPromise!: Promise<string | null>;

    act(() => {
      uploadPromise = result.current.upload(createImageFile(1024));
    });
    expect(result.current.isUploading).toBe(true);

    let url: string | null = null;
    await act(async () => {
      url = await uploadPromise;
    });

    expect(url).toBe(mockUploadImageResult.url);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('5MB 초과 파일 — 네트워크 요청 없이 즉시 ValidationError를 설정하고 null을 반환한다 (H-1)', async () => {
    const upload = countUploadCalls();
    const { result } = renderHook(() => useImageUpload());

    let url: string | null = null;
    await act(async () => {
      url = await result.current.upload(
        createImageFile(MAX_IMAGE_SIZE_BYTES + 1)
      );
    });

    expect(url).toBeNull();
    expect(result.current.isUploading).toBe(false);
    // H-1 이전에는 plain Error였다 — 이제 uploadImage()가 ValidationError로 정규화하므로
    // 형제 훅(useTodoList/useTodoDetail)과 동일하게 ApiError 계열이어야 한다.
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toBeInstanceOf(ValidationError);
    expect(upload.count()).toBe(0);
  });

  it('비이미지 MIME — 네트워크 요청 없이 즉시 ValidationError를 설정하고 null을 반환한다 (H-1)', async () => {
    const upload = countUploadCalls();
    const { result } = renderHook(() => useImageUpload());

    let url: string | null = null;
    await act(async () => {
      url = await result.current.upload(createImageFile(1024, 'text/plain'));
    });

    expect(url).toBeNull();
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toBeInstanceOf(ValidationError);
    expect(upload.count()).toBe(0);
  });

  it('서버 에러 응답 — error에 HttpError가 반영되고 반환값은 null이다', async () => {
    server.use(
      errorHandler(
        'post',
        `${TEST_API_BASE_URL}/images/upload`,
        500,
        errorBody('Upload failed')
      )
    );
    const { result } = renderHook(() => useImageUpload());

    let url: string | null = null;
    await act(async () => {
      url = await result.current.upload(createImageFile(1024));
    });

    expect(url).toBeNull();
    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeInstanceOf(HttpError);
    expect((result.current.error as HttpError).status).toBe(500);
  });

  it('연속 업로드 시 세대 가드가 먼저 시작해 나중에 끝나는 호출의 상태 반영을 막는다 (M-3)', async () => {
    const firstGate = createGate();
    let callCount = 0;
    server.use(
      http.post(`${TEST_API_BASE_URL}/images/upload`, async () => {
        callCount += 1;
        if (callCount === 1) {
          // 첫 번째(먼저 시작한) 호출은 테스트가 풀어줄 때까지 응답하지 않는다
          await firstGate.wait();
          return HttpResponse.json(errorBody('slow failure'), { status: 500 });
        }
        return HttpResponse.json(mockUploadImageResult);
      })
    );

    const { result } = renderHook(() => useImageUpload());

    let firstPromise!: Promise<string | null>;
    act(() => {
      firstPromise = result.current.upload(createImageFile(1024));
    });
    expect(result.current.isUploading).toBe(true);

    // 두 번째(나중에 시작한) 호출은 즉시 성공한다 — 첫 번째보다 먼저 끝난다
    let secondPromise!: Promise<string | null>;
    await act(async () => {
      secondPromise = result.current.upload(createImageFile(1024));
      await secondPromise;
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();

    // 첫 번째 호출을 뒤늦게 실패로 마무리한다 — 세대 가드가 없다면 이 시점에
    // isUploading이 다시 true→false로 흔들리거나 error가 실패로 뒤바뀐다.
    await act(async () => {
      firstGate.release();
      await firstPromise;
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
