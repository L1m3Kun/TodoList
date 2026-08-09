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
              // W-4 ①(렌더 버그) — Tailwind preflight가 모든 img에 height:auto를
              // 강제해, <picture>가 실제로는 Large를 그리는 넓은 화면(≥365px)에서도
              // 이 태그의 width/height 속성(Small 기준 71×40)으로 높이를 재계산해
              // 로고가 71×19로 찌그러졌다. 높이를 40px로 고정(h-10)하고 너비를 auto로
              // 풀어 실제 로드된 이미지의 원본 비율대로 너비가 잡히게 한다(두 원본 모두
              // 세로 120px → 40px로 동일 배율이라 h-10이 양쪽 상태에 맞는다).
              //
              // W-4 ②(콘솔 경고) — next/image는 렌더 치수와 선언 속성이 **한쪽만**
              // 어긋날 때 경고한다(image-component.js: heightModified XOR widthModified).
              // <picture>는 src를 통째로 갈아끼우므로 아트 디렉션과 next/image의 비율
              // 계약은 원리적으로 양립하지 않는다 — Large가 그려지면 너비만 어긋나
              // XOR이 성립했다.
              // → 선언값을 **원본 픽셀 그대로**(213×120) 두면 넓은 화면(151×40)이든
              //   좁은 화면(71×40)이든 두 치수가 **모두** 어긋나 XOR이 깨진다.
              //   TodoSection 배지와 동일한 원칙: 선언은 원본, 표시 크기는 CSS가 정한다.
              width={213}
              height={120}
              className="h-10 w-auto"
              // `priority`가 아니라 `loading="eager"`다. `priority`는 preload 링크를
              // 만드는데, <picture> 안에서는 실제로 그려지는 Large가 아니라 이 태그의
              // src(Small)를 preload해 **쓰지도 않을 이미지를 우선 받는다.**
              // LCP 경고가 요구하는 건 lazy 해제뿐이므로 eager로 충분하다.
              loading="eager"
            />
          </picture>
        </Link>
      </div>
    </div>
  );
}

export { GlobalNavBar };
