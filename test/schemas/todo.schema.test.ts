import { describe, expect, it } from 'vitest';
import {
  todoSummarySchema,
  todoDetailSchema,
  todoSummaryListSchema,
  createTodoInputSchema,
  updateTodoInputSchema,
  deleteResultSchema,
  uploadImageResultSchema,
} from '@/types/schemas/todo.schema';

describe('todoSummarySchema', () => {
  it('정상 페이로드를 파싱한다', () => {
    const payload = { id: 1, name: 'Buy milk', isCompleted: false };
    const result = todoSummarySchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('필수 필드(name)가 없으면 파싱에 실패한다', () => {
    const payload = { id: 1, isCompleted: false };
    const result = todoSummarySchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('todoDetailSchema', () => {
  it('정상 페이로드를 파싱한다', () => {
    const payload = {
      id: 1,
      tenantId: 'limekun',
      name: 'Buy milk',
      memo: 'from the store',
      imageUrl: 'https://example.com/a.png',
      isCompleted: false,
    };
    const result = todoDetailSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('memo·imageUrl이 null이어도 파싱에 성공한다 (함정 2 대응)', () => {
    const payload = {
      id: 1,
      tenantId: 'limekun',
      name: 'Buy milk',
      memo: null,
      imageUrl: null,
      isCompleted: false,
    };
    const result = todoDetailSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('필수 필드(tenantId)가 없으면 파싱에 실패한다', () => {
    const payload = {
      id: 1,
      name: 'Buy milk',
      memo: null,
      imageUrl: null,
      isCompleted: false,
    };
    const result = todoDetailSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('todoSummaryListSchema', () => {
  it('목록 페이로드에 memo 등 초과 필드가 섞여도 무시하고 통과한다 (함정 1 대응)', () => {
    const payload = [
      {
        id: 1,
        name: 'Buy milk',
        isCompleted: false,
        memo: 'should be stripped',
      },
      {
        id: 2,
        name: 'Walk dog',
        isCompleted: true,
        imageUrl: 'https://example.com/a.png',
      },
    ];
    const result = todoSummaryListSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0]).not.toHaveProperty('memo');
      expect(result.data[1]).not.toHaveProperty('imageUrl');
    }
  });

  it('빈 배열도 통과한다', () => {
    const result = todoSummaryListSchema.safeParse([]);
    expect(result.success).toBe(true);
  });
});

describe('createTodoInputSchema', () => {
  it('name이 있으면 통과한다', () => {
    const result = createTodoInputSchema.safeParse({ name: 'Buy milk' });
    expect(result.success).toBe(true);
  });

  it('name이 빈 문자열이면 실패한다 (min(1))', () => {
    const result = createTodoInputSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('name이 없으면 실패한다', () => {
    const result = createTodoInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('updateTodoInputSchema', () => {
  it('빈 객체를 통과시킨다 (서버가 no-op 허용)', () => {
    const result = updateTodoInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('일부 필드만 있어도 통과한다', () => {
    const result = updateTodoInputSchema.safeParse({ isCompleted: true });
    expect(result.success).toBe(true);
  });

  it('모든 필드가 있어도 통과한다', () => {
    const payload = {
      name: 'Buy milk',
      memo: 'from the store',
      imageUrl: 'https://example.com/a.png',
      isCompleted: true,
    };
    const result = updateTodoInputSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

describe('deleteResultSchema', () => {
  it('정상 페이로드를 파싱한다', () => {
    const result = deleteResultSchema.safeParse({
      message: 'Item deleted successfully',
    });
    expect(result.success).toBe(true);
  });

  it('message가 없으면 실패한다', () => {
    const result = deleteResultSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('uploadImageResultSchema', () => {
  it('정상 페이로드를 파싱한다', () => {
    const result = uploadImageResultSchema.safeParse({
      url: 'https://example.com/a.png',
    });
    expect(result.success).toBe(true);
  });

  it('url이 없으면 실패한다', () => {
    const result = uploadImageResultSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
