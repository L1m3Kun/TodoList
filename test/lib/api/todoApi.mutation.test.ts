import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { createTodo, deleteTodo, updateTodo } from '@/lib/api/todoApi';
import { ValidationError } from '@/lib/api/errors';
import { TEST_API_BASE_URL, mockDeleteResult, mockTodoDetail } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

describe('createTodo', () => {
  it('정상 경로 — 생성된 TodoDetailDto을 반환한다', async () => {
    const result = await createTodo({ name: 'New todo' });
    expect(result).toEqual(mockTodoDetail);
  });

  it('실제로 보낸 request body의 필드명이 정확하다(name)', async () => {
    let sentBody: unknown;
    server.use(
      http.post(`${TEST_API_BASE_URL}/items`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(mockTodoDetail);
      }),
    );

    await createTodo({ name: 'New todo' });

    expect(sentBody).toEqual({ name: 'New todo' });
  });

  it('name이 빈 문자열이면 ValidationError를 던지고 네트워크 요청을 보내지 않는다 (H-3 회귀)', async () => {
    let callCount = 0;
    server.use(
      http.post(`${TEST_API_BASE_URL}/items`, () => {
        callCount += 1;
        return HttpResponse.json(mockTodoDetail);
      }),
    );

    const error = await createTodo({ name: '' }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).message).toBe('입력값이 올바르지 않습니다.');
    // 원인 불명 실패(H-3)가 아니라 요청 검증 실패임을 문구로 구분할 수 있어야 한다
    expect((error as ValidationError).message).not.toBe('서버 응답이 예상한 형식과 다릅니다.');
    expect(callCount).toBe(0);
  });
});

describe('updateTodo', () => {
  it('정상 경로 — 수정된 TodoDetailDto을 반환한다', async () => {
    const result = await updateTodo(1, { isCompleted: true });
    expect(result).toEqual(mockTodoDetail);
  });

  it('실제로 보낸 request body의 필드명이 정확하다(name/memo/imageUrl/isCompleted)', async () => {
    let sentBody: unknown;
    server.use(
      http.patch(`${TEST_API_BASE_URL}/items/:itemId`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(mockTodoDetail);
      }),
    );

    await updateTodo(1, {
      name: 'Renamed',
      memo: 'memo text',
      imageUrl: 'http://example.com/img.png',
      isCompleted: true,
    });

    expect(sentBody).toEqual({
      name: 'Renamed',
      memo: 'memo text',
      imageUrl: 'http://example.com/img.png',
      isCompleted: true,
    });
  });
});

describe('deleteTodo', () => {
  it('정상 경로 — DeleteResult를 반환한다', async () => {
    const result = await deleteTodo(1);
    expect(result).toEqual(mockDeleteResult);
  });
});
