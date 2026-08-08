import { cn } from '@lib/utils';

interface StatusMessageProps {
  tone: 'loading' | 'error';
  title: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

function StatusMessage({
  tone,
  title,
  description,
  onRetry,
  className,
}: StatusMessageProps) {
  const isError = tone === 'error';

  const handleRetryClick = () => {
    onRetry?.();
  };

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? undefined : 'polite'}
      className={cn(
        'flex flex-col items-center justify-center gap-3 w-full rounded-3xl border-2 border-slate-900 bg-white px-6 py-10 text-center',
        className
      )}
    >
      <p
        className={cn(
          'font-bold text-xl',
          isError ? 'text-rose-500' : 'text-slate-800'
        )}
      >
        {title}
      </p>
      {description ? (
        <p className="text-sm font-medium text-slate-400">{description}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={handleRetryClick}
          className="mt-1 cursor-pointer rounded-2xl border-2 border-slate-900 bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-[3.65px_4px_#17233A] active:bg-violet-700"
        >
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

export { StatusMessage, type StatusMessageProps };
