import Image from 'next/image';
import { memo } from 'react';

import EmptyDoneLarge from '@assets/images/empty/done/Type=Done,Size=Large@3x.png';
import EmptyDoneSmall from '@assets/images/empty/done/Type=Done,Size=Small@3x.png';

function DoneEmptyCompo() {
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="h-40 phone:h-60">
        <picture className="flex items-center justify-center">
          <source
            media="(min-width: 365px)"
            srcSet={EmptyDoneLarge.src}
            width={240}
            height={240}
          />
          <Image src={EmptyDoneSmall} alt="empty" width={120} height={120} />
        </picture>
      </div>

      <div className="text-base font-bold text-center text-slate-400">
        <p>아직 다 한 일이 없어요.</p>
        <p>해야할 일을 체크해보세요!</p>
      </div>
    </div>
  );
}

const DoneEmpty = memo(DoneEmptyCompo);

export { DoneEmpty };
