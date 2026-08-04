import { cn } from '@/lib/utils';
import CheckBox from '@assets/icon/checkbox/Property 1=Default.svg';
import CheckedBox from '@assets/icon/checkbox/Property 1=Frame 2610233.svg';

interface TodoItemProps {
  todo: string;
  isFinish: boolean;
  finishTodo: () => void;
}

function TodoItem({ todo, isFinish, finishTodo }: TodoItemProps) {
  const handleClickTodo = () => {
    finishTodo();
  };
  return (
    <div
      className={cn(
        'flex items-center justify-start gap-4 w-full h-12.5 rounded-[27px] border-2 border-slate-900 py-4.5 px-2 font-normal text-[16px] text-slate-800',
        isFinish ? 'bg-violet-100' : 'bg-white'
      )}
      onClick={handleClickTodo}
    >
      {isFinish ? (
        <CheckedBox width="32" height="32" />
      ) : (
        <CheckBox width="32" height="32" />
      )}
      <span className={isFinish ? 'line-through' : ''}>{todo}</span>
    </div>
  );
}

export { TodoItem, type TodoItemProps };
