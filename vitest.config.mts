import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import fs from 'fs';
import path from 'path';

const RASTER_IMAGE_RE = /\.(png|jpe?g|gif|webp|avif)$/;
const ASSET_URL_RE = /export\s+default\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/;

/** PNG IHDR 청크에서 실제 픽셀 크기를 읽는다. PNG가 아니면 0을 반환한다. */
function readPngSize(filePath: string): { width: number; height: number } {
  try {
    const buf = fs.readFileSync(filePath);
    // PNG signature(8B) + chunk length(4B) + 'IHDR'(4B) → width@16, height@20
    if (buf.length >= 24 && buf.toString('ascii', 12, 16) === 'IHDR') {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
  } catch {
    /* 크기를 못 읽어도 src만 맞으면 되므로 0으로 진행 */
  }
  return { width: 0, height: 0 };
}

/**
 * Next.js(webpack)는 `.png` 정적 임포트를 `StaticImageData`(`{ src, width, height, ... }`)
 * 객체로 준다. next-env.d.ts가 참조하는 `next/image-types/global`이 실제로 그렇게 타이핑하므로
 * `GlobalNavBar.tsx`의 `srcSet={LargeImageUrl.src}`는 프로덕션에서 정상 동작한다.
 * 반면 vite 기본 asset 처리는 문자열 URL을 반환해 `.src`가 `undefined`가 되고,
 * 그 결과 테스트 환경에서만 `srcSet` 속성이 렌더되지 않는다(decisions.md D-9).
 * 타입 선언과 런타임 값이 어긋난 채로 두면 테스트가 "프로덕션 동작"이 아니라
 * "테스트 환경 결함"을 검증하게 되므로, D-2(SVG를 목킹 대신 vite-plugin-svgr로 실제
 * 트랜스폼한 결정)와 동일한 원칙으로 정적 이미지 임포트도 프로덕션 형태로 맞춘다.
 */
function nextStaticImageData(): Plugin {
  return {
    name: 'next-static-image-data',
    transform(code, id) {
      const filePath = id.split('?')[0];
      if (!RASTER_IMAGE_RE.test(filePath)) return null;

      const url = code.match(ASSET_URL_RE)?.[1];
      if (!url) return null;

      const { width, height } = readPngSize(filePath);
      return {
        code: `export default { src: ${url}, width: ${width}, height: ${height}, blurDataURL: ${url}, blurWidth: 0, blurHeight: 0 };`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    nextStaticImageData(),
    // vite-plugin-svgr@5.x: 기본 include는 `**/*.svg?react`라 쿼리 없는
    // 일반 `import Icon from '...svg'`(이 프로젝트의 실제 임포트 형태)를
    // 트랜스폼하지 않고 지나쳐 vite 기본 asset 처리(URL 문자열)로 떨어진다.
    // 그러면 PLAN-1이 막으려던 실패(SVG가 컴포넌트가 아닌 값으로 해석됨)가
    // 형태만 바뀌어 재발한다. include를 일반 `.svg` 경로에 매칭되도록 넓혀
    // 모든 `.svg` 임포트가 SVGR 트랜스폼을 타게 한다.
    // (참고: 5.x는 `exportAsDefault` 옵션 자체가 없다 — @svgr/core Config
    // 타입 확인 결과 없음. 대신 @svgr/core의 기본값 `exportType: 'default'`가
    // 이미 "default export = 컴포넌트"이므로 svgrOptions로 명시해 의도를 고정한다.)
    svgr({
      include: '**/*.svg',
      svgrOptions: { exportType: 'default' },
    }),
  ],
  test: {
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'http://example.com/api/test-tenant',
    },
    environment: 'jsdom',
    passWithNoTests: true,
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      enabled: true,
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/index.ts',
        'configs/**',
        'types/**',
        'assets/**',
        '**/*.schema.ts',
        '**/schemas/**',
      ],
    },
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
      '@assets': path.resolve(import.meta.dirname, './assets'),
      '@pages': path.resolve(import.meta.dirname, './pages'),
      '@components': path.resolve(import.meta.dirname, './components'),
      '@hooks': path.resolve(import.meta.dirname, './hooks'),
      '@lib': path.resolve(import.meta.dirname, './lib'),
      '@types': path.resolve(import.meta.dirname, './types'),
    },
  },
});
