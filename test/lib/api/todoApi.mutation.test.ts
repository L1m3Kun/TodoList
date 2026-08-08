import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { createTodo, deleteTodo, updateTodo } from '@/lib/api/todoApi';
import { TEST_API_BASE_URL, mockDeleteResult, mockTodoDetail } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

describe('createTodo', () => {
  it('정상 경로 — 생성된 TodoDetail을 반환한다', async () => {
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
});

describe('updateTodo', () => {
  it('정상 경로 — 수정된 TodoDetail을 반환한다', async () => {
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
