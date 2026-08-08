import Image from 'next/image';
import Link from 'next/link';

import LargeImageUrl from '@assets/logo/large/Size=Large@3x.png';
import SmallImageUrl from '@assets/logo/small/Size=Small@3x.png';

function GlobalNavBar() {
  return (
    <div className="fixed z-50 flex items-center justify-center w-full bg-white border-b h-15 border-slate-200">
      <div className="w-full mx-4 table:mx-auto mobile:mx-6 tablet:max-w-300 tablet:px-4">
        <Link href="/">
          <picture>
            <source
              media="(min-width: 365px)"
              srcSet={LargeImageUrl.src}
              width={151}
              height={40}
            />
            <Image
              src={SmallImageUrl}
              alt="todo logo"
              sizes=""
              width={71}
              height={40}
            />
          </picture>
        </Link>
      </div>
    </div>
  );
}

export { GlobalNavBar };
