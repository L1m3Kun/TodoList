import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getTodo, getTodos } from '@/lib/api/todoApi';
import { HttpError } from '@/lib/api/errors';
import {
  TEST_API_BASE_URL,
  errorBody,
  errorHandler,
  mockTodoDetail,
  mockTodoSummary,
} from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

describe('getTodos', () => {
  it('params 생략 시 쿼리스트링 없이 /items를 호출한다', async () => {
    let requestedUrl = '';
    server.use(
      http.get(`${TEST_API_BASE_URL}/items`, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json([mockTodoSummary]);
      }),
    );

    const result = await getTodos();

    expect(requestedUrl).toBe(`${TEST_API_BASE_URL}/items`);
    expect(result).toEqual([mockTodoSummary]);
  });

  it('준 params만 쿼리스트링에 포함한다(서버 기본값을 재정의하지 않는다)', async () => {
    let requestedUrl = '';
    server.use(
      http.get(`${TEST_API_BASE_URL}/items`, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json([mockTodoSummary]);
      }),
    );

    await getTodos({ page: 2 });

    expect(requestedUrl).toBe(`${TEST_API_BASE_URL}/items?page=2`);
  });

  it('page/pageSize를 모두 주면 둘 다 쿼리스트링에 포함한다', async () => {
    let requestedUrl = '';
    server.use(
      http.get(`${TEST_API_BASE_URL}/items`, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json([mockTodoSummary]);
      }),
    );

    await getTodos({ page: 2, pageSize: 20 });

    expect(requestedUrl).toBe(`${TEST_API_BASE_URL}/items?page=2&pageSize=20`);
  });

  it('목록 응답에 memo/imageUrl이 없어도 타입 에러 없이 정상 파싱된다(함정 1 회귀)', async () => {
    // 기본 handlers의 GET /items가 이미 {id,name,isCompleted}만 반환 — 그대로 사용
    const result = await getTodos();

    expect(result).toEqual([mockTodoSummary]);
    expect(result[0]).not.toHaveProperty('memo');
    expect(result[0]).not.toHaveProperty('imageUrl');
  });
});

describe('getTodo', () => {
  it('정상 경로 — 상세 응답을 파싱해 반환한다', async () => {
    const result = await getTodo(1);
    expect(result).toEqual(mockTodoDetail);
  });

  it('404 응답은 HttpError로 전파된다', async () => {
    server.use(
      errorHandler(
        'get',
        `${TEST_API_BASE_URL}/items/:itemId`,
        404,
        errorBody('Item with ID 999999 not found for tenant limekun'),
      ),
    );

    await expect(getTodo(999999)).rejects.toBeInstanceOf(HttpError);
  });
});
