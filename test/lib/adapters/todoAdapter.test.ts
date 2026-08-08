import { describe, expect, it } from 'vitest';
import { toTodo, toTodoDetail, toUpdateTodoInput } from '@lib/adapters/todoAdapter';
import type { TodoDetail } from '@/types/todo';
import type { TodoDetailDto, TodoSummaryDto } from '@/types/todo.dto';

describe('toTodo', () => {
  it('DTO 필드명을 화면 어휘로 매핑한다 (name→todo, isCompleted→isFinish)', () => {
    const dto: TodoSummaryDto = { id: 1, name: '빨래하기', isCompleted: false };

    expect(toTodo(dto)).toEqual({ id: 1, todo: '빨래하기', isFinish: false });
  });

  it('isCompleted: true는 isFinish: true로 매핑한다', () => {
    const dto: TodoSummaryDto = { id: 2, name: '설거지', isCompleted: true };

    expect(toTodo(dto)).toEqual({ id: 2, todo: '설거지', isFinish: true });
  });
});

describe('toTodoDetail', () => {
  it('DTO 필드명을 화면 어휘로 매핑한다', () => {
    const dto: TodoDetailDto = {
      id: 1,
      tenantId: 'limekun',
      name: '빨래하기',
      memo: '흰옷 분리',
      imageUrl: 'https://example.com/a.png',
      isCompleted: false,
    };

    expect(toTodoDetail(dto)).toEqual({
      id: 1,
      todo: '빨래하기',
      memo: '흰옷 분리',
      imageUrl: 'https://example.com/a.png',
      isFinish: false,
    });
  });

  it('memo·imageUrl이 null이면 빈 문자열로 정규화한다(D-68)', () => {
    const dto: TodoDetailDto = {
      id: 1,
      tenantId: 'limekun',
      name: '빨래하기',
      memo: null,
      imageUrl: null,
      isCompleted: false,
    };

    expect(toTodoDetail(dto)).toEqual({
      id: 1,
      todo: '빨래하기',
      memo: '',
      imageUrl: '',
      isFinish: false,
    });
  });
});

describe('toUpdateTodoInput', () => {
  const base: TodoDetail = {
    id: 1,
    todo: '빨래하기',
    memo: '흰옷 분리',
    imageUrl: 'https://example.com/a.png',
    isFinish: false,
  };

  it('draft가 base와 동일하면 빈 객체를 반환한다(변경 없음 = isDirty false)', () => {
    const draft: TodoDetail = { ...base };

    expect(toUpdateTodoInput(draft, base)).toEqual({});
  });

  it('memo 한 필드만 바뀌면 그 필드만 담는다(name/imageUrl/isCompleted 없음)', () => {
    const draft: TodoDetail = { ...base, memo: '색깔옷 분리' };
    const patch = toUpdateTodoInput(draft, base);

    expect(patch).toEqual({ memo: '색깔옷 분리' });
    expect(Object.keys(patch)).toHaveLength(1);
  });

  it('isFinish 한 필드만 바뀌면 isCompleted만 담는다', () => {
    const draft: TodoDetail = { ...base, isFinish: true };

    expect(toUpdateTodoInput(draft, base)).toEqual({ isCompleted: true });
  });

  it('4개 필드가 모두 바뀌면 전부 담는다', () => {
    const draft: TodoDetail = {
      id: 1,
      todo: '설거지',
      memo: '식기세척기 사용',
      imageUrl: 'https://example.com/b.png',
      isFinish: true,
    };

    expect(toUpdateTodoInput(draft, base)).toEqual({
      name: '설거지',
      memo: '식기세척기 사용',
      imageUrl: 'https://example.com/b.png',
      isCompleted: true,
    });
  });
});
