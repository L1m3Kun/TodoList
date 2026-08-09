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
          {/* W-4 — TodoSection이 페이지 최초 진입 시 항상 나란히 렌더되므로
              done 리스트가 비어 있으면 이 이미지가 above-the-fold LCP
              후보로 잡힌다(E2E 실측). eager 로딩 대상으로 표시한다. */}
          <Image
            src={EmptyDoneSmall}
            alt="empty"
            width={120}
            height={120}
            priority
          />
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
