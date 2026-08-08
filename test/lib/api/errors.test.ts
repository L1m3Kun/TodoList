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
});
