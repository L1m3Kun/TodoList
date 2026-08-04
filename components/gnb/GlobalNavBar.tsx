import Image from 'next/image';
import Link from 'next/link';

import LargeImageUrl from '@assets/logo/large/Size=Large@3x.png';
import SmallImageUrl from '@assets/logo/small/Size=Small@3x.png';

function GlobalNavBar() {
  return (
    <div className="w-full h-15 flex items-center border-b border-slate-200 pl-90 max-phone:pl-4 max-tablet:pl-6">
      <Link href="/">
        <picture>
          <source media="(min-width: 365px)" srcSet={LargeImageUrl.src} />
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
  );
}

export { GlobalNavBar };
