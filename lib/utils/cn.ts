import { twMerge } from 'tailwind-merge';
import { clsx, ClassValue } from 'clsx';

/**
 * className 병합 함수
 * @param classNames tailwindcss className 배열
 * @returns 병합된 하나의 문자열 className
 */
const cn = (...classNames: ClassValue[]) => {
  return twMerge(clsx(classNames));
};

export { cn };
