'use client';

import { ChangeEvent, useId } from 'react';

import MemoBg from '@assets/images/memo/memo@3x.png';
import { cn } from '@/lib/utils';

interface TodoMemoBoxProps {
  memo?: string;
  onChangeMemo?: (value: string) => void;
  className?: string;
}

function TodoMemoBox({ memo, onChangeMemo, className }: TodoMemoBoxProps) {
  const hasMemo = Boolean(memo);
  const titleId = useId();

  const handleChangeMemo = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChangeMemo?.(e.target.value);
  };

  return (
    <div
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-3xl bg-repeat bg-[length:100%_auto] aspect-[10/9] tablet:aspect-[11/5] lg:aspect-[6/5]',
        className
      )}
      style={{ backgroundImage: `url(${MemoBg.src})` }}
    >
      <h2
        id={titleId}
        className="pt-4 text-center text-lg font-bold text-amber-600 tablet:pt-6"
      >
        Memo
      </h2>
      <textarea
        value={memo ?? ''}
        onChange={handleChangeMemo}
        readOnly={!onChangeMemo}
        placeholder="메모를 입력해주세요"
        aria-labelledby={titleId}
        className={cn(
          'flex-1 resize-none bg-transparent px-6 py-4 text-sm text-slate-700 outline-none placeholder:text-slate-400',
          hasMemo
            ? 'overflow-y-auto text-left'
            : 'overflow-hidden text-center placeholder:text-center'
        )}
      />
    </div>
  );
}

export { TodoMemoBox, type TodoMemoBoxProps };
