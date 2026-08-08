import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { request } from '@/lib/api/client';
import { getApiBaseUrl } from '@/lib/api/config';
import { HttpError, NetworkError, ValidationError } from '@/lib/api/errors';
import {
  deleteResultSchema,
  todoDetailSchema,
  uploadImageResultSchema,
} from '@/types/schemas/todo.schema';
import {
  TEST_API_BASE_URL,
  errorBody,
  errorHandler,
  mockTodoDetail,
  mockUploadImageResult,
} from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

/** promise가 reject하도록 기대하는 테스트에서 던져진 값을 그대로 돌려받는다. */
async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    throw new Error('예상된 에러가 발생하지 않았다');
  } catch (error) {
    return error;
  }
}

describe('request() — 정상 응답', () => {
  it('2xx 응답을 schema로 파싱해 반환한다', async () => {
    const result = await request(
      '/items/1',
      { method: 'GET' },
      todoDetailSchema
    );

    expect(result).toEqual(mockTodoDetail);
  });

  it('FormData 바디를 보낼 때 client가 Content-Type을 강제로 설정하지 않는다', async () => {
    const formData = new FormData();
    formData.append('image', new File(['x'], 'a.png', { type: 'image/png' }));

    const result = await request(
      '/images/upload',
      { method: 'POST', body: formData },
      uploadImageResultSchema
    );

    expect(result).toEqual(mockUploadImageResult);
  });
});

describe('request() — HttpError (D-53 실측 에러 바디 형태)', () => {
  it('400 + {message, details} 바디 → HttpError.status·serverMessage·details가 보존된다', async () => {
    server.use(
      errorHandler(
        'post',
        `${TEST_API_BASE_URL}/items`,
        400,
        errorBody('Validation Failed', {
          'createItemDto.name': { message: "'name' is required" },
        })
      )
    );

    const error = await captureError(
      request('/items', { method: 'POST' }, todoDetailSchema)
    );

    expect(error).toBeInstanceOf(HttpError);
    const httpError = error as HttpError;
    expect(httpError.status).toBe(400);
    expect(httpError.serverMessage).toBe('Validation Failed');
    expect(httpError.details).toEqual({
      'createItemDto.name': { message: "'name' is required" },
    });
  });

  it('에러 바디가 없거나 JSON이 아니면 statusText로 폴백한다', async () => {
    server.use(
      http.get(
        `${TEST_API_BASE_URL}/items/:itemId`,
        () => new HttpResponse(null, { status: 404, statusText: 'Not Found' })
      )
    );

    const error = await captureError(
      request('/items/999', { method: 'GET' }, todoDetailSchema)
    );

    expect(error).toBeInstanceOf(HttpError);
    const httpError = error as HttpError;
    expect(httpError.status).toBe(404);
    expect(httpError.serverMessage).toBe('Not Found');
  });

  it('DELETE 500 + 원시 Prisma 메시지 — 사용자 표시 메시지가 원문을 그대로 노출하지 않는다 (D-53)', async () => {
    const rawPrismaMessage =
      '\nInvalid `prisma.item.delete()` invocation:\n... Record to delete does not exist.';
    server.use(
      errorHandler(
        'delete',
        `${TEST_API_BASE_URL}/items/:itemId`,
        500,
        errorBody(rawPrismaMessage)
      )
    );

    const error = await captureError(
      request('/items/999999', { method: 'DELETE' }, deleteResultSchema)
    );

    expect(error).toBeInstanceOf(HttpError);
    const httpError = error as HttpError;
    expect(httpError.status).toBe(500);
    expect(httpError.serverMessage).toBe(rawPrismaMessage);
    expect(httpError.message).not.toBe(rawPrismaMessage);
    expect(httpError.message.toLowerCase()).not.toContain('prisma');
  });
});

describe('request() — NetworkError', () => {
  it('네트워크 자체가 실패하면 NetworkError로 정규화된다', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/items/:itemId`, () => HttpResponse.error())
    );

    const error = await captureError(
      request('/items/1', { method: 'GET' }, todoDetailSchema)
    );

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).kind).toBe('network');
  });
});

describe('request() — ValidationError', () => {
  it('응답이 계약과 다른 필드명이면 ValidationError가 발생하고 ZodError를 cause로 보존한다', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/items/:itemId`, () =>
        HttpResponse.json({ wrongField: 'oops' })
      )
    );

    const error = await captureError(
      request('/items/1', { method: 'GET' }, todoDetailSchema)
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).cause).toBeInstanceOf(z.ZodError);
  });
});

describe('getApiBaseUrl() — 설정 오류 경로 (lib/api/config.ts)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('NEXT_PUBLIC_API_BASE_URL이 없으면 즉시 Error를 던진다', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '');

    expect(() => getApiBaseUrl()).toThrow();
  });

  it('설정되어 있으면 그 값을 그대로 반환한다(tenantId를 재조립하지 않는다)', () => {
    vi.stubEnv(
      'NEXT_PUBLIC_API_BASE_URL',
      'http://example.com/api/other-tenant'
    );

    expect(getApiBaseUrl()).toBe('http://example.com/api/other-tenant');
  });
});
