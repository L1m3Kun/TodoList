import { describe, expect, it } from 'vitest';
import { parseTodoId } from '@lib/utils/parseTodoId';

describe('parseTodoId', () => {
  it('문자열 정수를 number로 변환한다', () => {
    expect(parseTodoId('1')).toBe(1);
  });

  it('숫자를 그대로 반환한다', () => {
    expect(parseTodoId(1)).toBe(1);
  });

  it('소수 문자열은 실패한다', () => {
    expect(() => parseTodoId('1.5')).toThrow();
  });

  it('음수 문자열은 실패한다', () => {
    expect(() => parseTodoId('-1')).toThrow();
  });

  it('숫자가 아닌 문자열은 실패한다', () => {
    expect(() => parseTodoId('abc')).toThrow();
  });

  it('빈 문자열은 실패한다', () => {
    expect(() => parseTodoId('')).toThrow();
  });

  it('0은 실패한다(양수 아님)', () => {
    expect(() => parseTodoId(0)).toThrow();
    expect(() => parseTodoId('0')).toThrow();
  });
});
