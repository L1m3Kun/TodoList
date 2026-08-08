import { describe, expect, it } from 'vitest';

import { cn } from '@lib/utils';

describe('cn 함수 테스트', () => {
  it('텍스트 배열을 띄어쓰기로 구분하는 하나의 텍스트 형태로 구성된다.', () => {
    expect(cn('px-2', 'py-1', 'text-sm')).toBe('px-2 py-1 text-sm');
  });

  it('falsy 값에 대한 글자는 무시되어 병합된다.', () => {
    expect(cn('base', false && 'hidden', null, undefined, 'active')).toBe(
      'base active'
    );
  });

  it('같은 설정에 대한 병합이 마지막 값을 기준으로 처리된다.', () => {
    expect(cn('p-2', 'p-4', 'text-sm', 'text-lg')).toBe('p-4 text-lg');
  });

  it('clsx에 의해 배열이나 객체 형태의 입력이 띄어쓰기로 구분된 하나의 문자열로 구성되어 처리된다.', () => {
    expect(
      cn(['flex', 'items-center'], {
        'font-bold': true,
        hidden: false,
      })
    ).toBe('flex items-center font-bold');
  });

  it('인자 없이 호출하면 빈 문자열을 반환한다.', () => {
    expect(cn()).toBe('');
  });

  it('Tailwind 단축 속성이 개별 속성을 덮어쓴다.', () => {
    expect(cn('px-2', 'py-2', 'p-4')).toBe('p-4');
  });

  it('중첩 배열 입력도 하나의 문자열로 병합된다.', () => {
    expect(cn(['flex', ['items-center']])).toBe('flex items-center');
  });

  it('0과 빈 배열 같은 falsy 값은 무시된다.', () => {
    expect(cn('base', 0, undefined, null, [], 'active')).toBe('base active');
  });
});
