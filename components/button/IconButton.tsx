import { ReactNode } from 'react';
import {
  Button as HLButton,
  ButtonProps as HBButtonProps,
} from '@headlessui/react';
import { cva, type VariantProps } from 'class-variance-authority';
import PlusIcon from '@assets/icon/plus/Property 1=plus.svg';
import EditIcon from '@assets/icon/edit/edit.svg';
import { cn } from '@lib/utils';

const iconButtonVariants = cva(
  'w-16 h-16 flex justify-center items-center rounded-full cursor-pointer ',
  {
    variants: {
      variant: {
        add: 'bg-slate-200 text-slate-500',
        edit: 'bg-slate-900/50 border-slate-900 border-2 text-white',
      },
    },
    defaultVariants: {
      variant: 'add',
    },
  }
);

interface IconButtonProps
  extends
    Omit<HBButtonProps, 'children'>,
    VariantProps<typeof iconButtonVariants> {
  children?: ReactNode;
}

const IconButton = ({
  variant,
  children,
  className,
  disabled,
  ...rest
}: IconButtonProps) => {
  const classes = cn(iconButtonVariants({ variant }), className);

  switch (variant) {
    case 'add':
      return (
        <HLButton
          type="button"
          disabled={disabled}
          className={classes}
          {...rest}
        >
          <PlusIcon width="24" height="24" />
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
          <EditIcon width="24" height="24" />
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

export { IconButton, iconButtonVariants, type IconButtonProps };
