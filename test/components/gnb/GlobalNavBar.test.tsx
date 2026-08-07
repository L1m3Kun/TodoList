import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { GlobalNavBar } from '@components/gnb';
import LargeImageUrl from '@assets/logo/large/Size=Large@3x.png';
import SmallImageUrl from '@assets/logo/small/Size=Small@3x.png';

afterEach(cleanup);

describe('GNB', () => {
  it('브라우저 넓이가 365px보다 크면 큰 로고 이미지를 렌더링한다.', () => {
    const { container } = render(<GlobalNavBar />);

    // <source>는 접근성 role이 없어 getByRole/getByLabelText로 접근할 수 없다
    // → queryPriority의 최후 수단인 container.querySelector 사용.
    const source = container.querySelector('picture source');
    expect(source).toBeInTheDocument();

    // ⚠️ 구조 검증이지 실제 반응형 전환 검증이 아니다. jsdom은 CSS 미디어쿼리를
    // 평가하지 않으므로 "365px 초과일 때 이 <source>가 실제로 선택되어 그려지는가"는
    // 확인할 수 없다(PLAN-6). 마크업이 큰 로고를 올바로 참조하는지만 확인한다.
    expect(source).toHaveAttribute('media', '(min-width: 365px)');
    expect(source).toHaveAttribute('srcSet', LargeImageUrl.src);
  });

  it('브라우저 넓이가 365px보다 작으면 작은 로고 이미지를 렌더링한다.', () => {
    render(<GlobalNavBar />);

    // ⚠️ 위와 동일하게 구조 검증이다. <source>의 media가 거짓일 때 브라우저가
    // fallback <img>를 그리는 것은 <picture> 표준 동작이지만 jsdom은 이를
    // 평가하지 않는다(PLAN-6).
    const img = screen.getByRole('img', { name: 'todo logo' });

    // next/image는 원본 경로를 최적화 URL(`/_next/image?url=...&w=...&q=...`)로
    // 감싸므로, 인코딩을 푼 뒤 원본 경로 포함 여부로 검증한다.
    const decodedSrc = decodeURIComponent(img.getAttribute('src') ?? '');
    expect(decodedSrc).toContain(SmallImageUrl.src);
  });

  it('로고 이미지를 클릭하면 "/" 위치로 이동한다.', () => {
    render(<GlobalNavBar />);

    // next/link의 실제 클라이언트 사이드 네비게이션은 jsdom에 라우터가 없어
    // 검증 불가능한 영역이다. 렌더된 <a>의 href가 의도한 목적지를 가리키는지로
    // 한정해 검증한다(PLAN-6). accessible name은 내부 <img alt="todo logo">에서 파생된다.
    const link = screen.getByRole('link', { name: /todo logo/i });
    expect(link).toHaveAttribute('href', '/');
  });
});
