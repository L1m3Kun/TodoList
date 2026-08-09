import { describe, expect, it } from 'vitest';
import { parseTodoId, safeParseTodoId } from '@lib/utils/parseTodoId';

describe('parseTodoId', () => {
  it('문자열 정수를 number로 변환한다', () => {
    expect(parseTodoId('1')).toBe(1);
    expect(parseTodoId('42')).toBe(42);
  });

  it('숫자를 그대로 반환한다', () => {
    expect(parseTodoId(7)).toBe(7);
  });

  it('소수 문자열은 거부한다', () => {
    expect(() => parseTodoId('1.5')).toThrow();
  });

  it('음수 문자열은 거부한다', () => {
    expect(() => parseTodoId('-1')).toThrow();
  });

  it('숫자가 아닌 문자열은 거부한다', () => {
    expect(() => parseTodoId('abc')).toThrow();
  });

  it('빈 문자열은 거부한다', () => {
    expect(() => parseTodoId('')).toThrow();
  });

  it('0은 거부한다(양수 아님)', () => {
    expect(() => parseTodoId(0)).toThrow();
    expect(() => parseTodoId('0')).toThrow();
  });

  // D-74: Number() 단독 변환은 아래를 전부 통과시켰다(실측) — 정규식 가드로 거부해야 한다.
  it('16진수 표기(0x10)는 거부한다', () => {
    expect(() => parseTodoId('0x10')).toThrow();
  });

  it('지수 표기(1e3)는 거부한다', () => {
    expect(() => parseTodoId('1e3')).toThrow();
  });

  it('앞뒤 공백이 있는 문자열은 거부한다', () => {
    expect(() => parseTodoId('  2  ')).toThrow();
  });

  it('양의 부호(+5)는 거부한다', () => {
    expect(() => parseTodoId('+5')).toThrow();
  });
});

describe('safeParseTodoId', () => {
  it('유효한 입력은 number를 반환한다', () => {
    expect(safeParseTodoId('1')).toBe(1);
    expect(safeParseTodoId(7)).toBe(7);
  });

  it('던지지 않고 null을 반환한다', () => {
    expect(safeParseTodoId('0x10')).toBeNull();
    expect(safeParseTodoId('1e3')).toBeNull();
    expect(safeParseTodoId('abc')).toBeNull();
    expect(safeParseTodoId('')).toBeNull();
  });

  it('parseTodoId가 던지는 입력에도 예외를 전파하지 않는다', () => {
    expect(() => safeParseTodoId('0x10')).not.toThrow();
  });
});
