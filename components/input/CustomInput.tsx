import {
  Input as HLInput,
  InputProps as HLInputProps,
} from '@headlessui/react';
import { ChangeEvent } from 'react';

import { cn } from '@/lib/utils';

interface InputProps extends Omit<HLInputProps, 'value' | 'onChange'> {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
}

function Input({ value, onChange, className, ...rest }: InputProps) {
  const changeValue = (e: ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const newValue = target.value;
    onChange(newValue);
  };
  return (
    <HLInput
      className={cn(
        'border-2 border-slate-900 bg-slate-100 rounded-3xl  font-normal text-[16px] flex items-center justify-start px-6 py-4.5 shadow-[3.5px_4px_#0f172a]',
        className
      )}
      onChange={changeValue}
      value={value}
      placeholder="할 일을 입력해주세요"
      {...rest}
    />
  );
}

export { Input };
