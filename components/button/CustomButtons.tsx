import { ReactNode } from 'react';
import {
  Button as HLButton,
  ButtonProps as HBButtonProps,
} from '@headlessui/react';
import { cva, type VariantProps } from 'class-variance-authority';

import PlusIcon from '@assets/icon/plus/Property 1=plus.svg';
import XIcon from '@assets/icon/x/X.svg';
import CheckIcon from '@assets/icon/check/check.svg';
import { cn } from '@lib/utils';

const buttonVariants = cva(
  'flex items-center justify-center gap-[4px] w-[164.35px] h-[52px] rounded-[24px] border-slate-900 border-2  font-bold font-nanumSquare text-lg shadow-[3.65px_4px_#17233A] cursor-pointer',
  {
    variants: {
      variant: {
        add: 'bg-slate-200 active:bg-violet-600 active:text-white w-[54.78px] tablet:w-[164.35px] tablet:after:content-["추가하기"]',
        delete: 'bg-rose-500 text-white',
        edit: 'bg-slate-200 active:bg-lime-300',
      },
    },
    defaultVariants: {
      variant: 'add',
    },
  }
);

interface ButtonProps
  extends Omit<HBButtonProps, 'children'>, VariantProps<typeof buttonVariants> {
  children?: ReactNode;
}

const Button = ({
  variant,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) => {
  const classes = cn(buttonVariants({ variant }), className);

  switch (variant) {
    case 'add':
      return (
        <HLButton
          type="button"
          disabled={disabled}
          className={classes}
          {...rest}
        >
          <PlusIcon className="w-4 h-4" />
        </HLButton>
      );
    case 'delete':
      return (
        <HLButton
          type="button"
          disabled={disabled}
          className={classes}
          {...rest}
        >
          <XIcon className="w-4 h-4" />
          삭제하기
        </HLButton>
      );
    case 'edit':
      return (
        <HLButton
          type="submit"
          disabled={disabled}
          className={classes}
          {...rest}
        >
          <CheckIcon className="w-4 h-4" />
          수정 완료
        </HLButton>
      );
    default:
      return (
        <HLButton
          type="button"
          disabled={disabled}
          className={classes}
          {...rest}
        >
          {children}
        </HLButton>
      );
  }
};

export { Button, buttonVariants, type ButtonProps };
