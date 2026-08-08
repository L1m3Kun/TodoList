import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError, HttpError, NetworkError, ValidationError } from '@/lib/api/errors';

describe('NetworkError', () => {
  it('Error·ApiError·NetworkError의 instanceof를 만족하고 kind·cause를 보존한다', () => {
    const cause = new TypeError('Failed to fetch');
    const error = new NetworkError(cause);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.kind).toBe('network');
    expect(error.cause).toBe(cause);
  });
});

describe('HttpError', () => {
  it('status·serverMessage를 그대로 보존하고 kind는 http다', () => {
    const error = new HttpError(404, 'Item with ID 999999 not found for tenant limekun');

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.kind).toBe('http');
    expect(error.status).toBe(404);
    expect(error.serverMessage).toBe('Item with ID 999999 not found for tenant limekun');
  });

  it('details가 주어지면 그대로 보존한다', () => {
    const details = { 'createItemDto.name': { message: "'name' is required" } };
    const error = new HttpError(400, 'Validation Failed', details);

    expect(error.details).toEqual(details);
  });

  it('details가 없으면 undefined다', () => {
    const error = new HttpError(404, 'not found');

    expect(error.details).toBeUndefined();
  });

  it('사용자 표시 메시지(message)는 서버 원문을 그대로 노출하지 않는다 (D-53, 500 원시 Prisma 메시지)', () => {
    const rawPrismaMessage =
      "\nInvalid `prisma.item.delete()` invocation:\n... Record to delete does not exist.";
    const error = new HttpError(500, rawPrismaMessage);

    expect(error.serverMessage).toBe(rawPrismaMessage);
    expect(error.message).not.toBe(rawPrismaMessage);
    expect(error.message.toLowerCase()).not.toContain('prisma');
  });

  it('상태코드별로 다른 안전한 사용자 메시지를 매핑한다 (500을 서버 장애로 단정하지 않는다)', () => {
    const notFound = new HttpError(404, 'x');
    const serverError = new HttpError(500, 'y');

    expect(notFound.message).not.toBe(serverError.message);
    expect(notFound.status).toBe(404);
    expect(serverError.status).toBe(500);
  });

  it('toJSON()은 kind·status·message만 노출하고 serverMessage·details는 감춘다 (M-1)', () => {
    const rawPrismaMessage =
      "\nInvalid `prisma.item.delete()` invocation:\n... Record to delete does not exist.";
    const error = new HttpError(500, rawPrismaMessage, {
      itemId: { message: 'not found' },
    });

    expect(error.toJSON()).toEqual({
      kind: 'http',
      status: 500,
      message: error.message,
    });
    // 언어 기본 직렬화(JSON.stringify)가 own enumerable 프로퍼티를 그대로 뱉는
    // 경로까지 toJSON()이 실제로 가로채는지 확인한다.
    expect(JSON.stringify(error)).not.toContain('prisma');
    expect(JSON.stringify(error)).not.toContain('itemId');
  });
});

describe('ValidationError', () => {
  it('kind=validation이고 ZodError를 cause로 보존한다', () => {
    const schema = z.object({ id: z.number() });
    const result = schema.safeParse({ id: 'not-a-number' });
    if (result.success) {
      throw new Error('테스트 설정 실패: safeParse가 성공했다');
    }

    const error = new ValidationError(result.error);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.kind).toBe('validation');
    expect(error.cause).toBe(result.error);
    expect(error.cause).toBeInstanceOf(z.ZodError);
  });

  it('message를 넘기면 그 문구를 쓴다 (H-3 — 요청 검증과 응답 파싱 문구 분리)', () => {
    const schema = z.object({ name: z.string().min(1) });
    const result = schema.safeParse({ name: '' });
    if (result.success) {
      throw new Error('테스트 설정 실패: safeParse가 성공했다');
    }

    const error = new ValidationError(result.error, '입력값이 올바르지 않습니다.');

    expect(error.message).toBe('입력값이 올바르지 않습니다.');
    expect(error.message).not.toBe('서버 응답이 예상한 형식과 다릅니다.');
  });

  it('message를 생략하면 응답 파싱 실패용 기본 문구를 쓴다', () => {
    const schema = z.object({ id: z.number() });
    const result = schema.safeParse({ id: 'oops' });
    if (result.success) {
      throw new Error('테스트 설정 실패: safeParse가 성공했다');
    }

    const error = new ValidationError(result.error);

    expect(error.message).toBe('서버 응답이 예상한 형식과 다릅니다.');
  });

  it('cause가 plain Error여도(ZodError가 아니어도) 정규화된다 (H-1 — validateImageFile 흡수)', () => {
    const cause = new Error('Image file too large: 6000000 bytes (max 5242880 bytes)');

    const error = new ValidationError(cause, '이미지 파일이 올바르지 않습니다.');

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe('validation');
    expect(error.message).toBe('이미지 파일이 올바르지 않습니다.');
    expect(error.cause).toBe(cause);
    expect(error.details).toBeUndefined();
  });

  it('cause가 ZodError면 필드별 details를 추출한다', () => {
    const schema = z.object({ name: z.string().min(1) });
    const result = schema.safeParse({ name: '' });
    if (result.success) {
      throw new Error('테스트 설정 실패: safeParse가 성공했다');
    }

    const error = new ValidationError(result.error, '입력값이 올바르지 않습니다.');

    expect(error.details).toBeDefined();
    expect(error.details?.name?.message).toBeTruthy();
  });
});
