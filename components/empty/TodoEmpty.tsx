import Image from 'next/image';
import { memo } from 'react';

import EmptyTodoLarge from '@assets/images/empty/todo/Type=Todo,Size=Large@3x.png';
import EmptyTodoSmall from '@assets/images/empty/todo/Type=todo,Size=Small@3x.png';

function TodoEmptyCompo() {
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="h-40 phone:h-60">
        <picture className="flex items-center justify-center">
          <source
            media="(min-width: 365px)"
            srcSet={EmptyTodoLarge.src}
            width={240}
            height={240}
          />
          <Image src={EmptyTodoSmall} alt="empty" width={120} height={120} />
        </picture>
      </div>

      <div className="text-base font-bold text-center text-slate-400">
        <p>할 일이 없어요.</p>
        <p>TODO를 새롭게 추가해주세요!</p>
      </div>
    </div>
  );
}

const TodoEmpty = memo(TodoEmptyCompo);

export { TodoEmpty };
