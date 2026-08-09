# todolist-for-codeit

코드잇 스프린트 프론트엔드 과제로 만든 Todo 리스트 웹 애플리케이션. 목록 조회·추가·완료 토글과
상세 조회·수정(제목/메모/이미지)·삭제를 지원하며, 외부 REST API(`NEXT_PUBLIC_API_BASE_URL`)와
클라이언트에서 직접 연동한다(서버 프록시 없음).

## 기술 스택

- **Next.js 16.3.0** — App Router, `next dev`/`next build` 모두 Turbopack
- **React 19.2.8**
- **TypeScript ^5** — strict mode, `any` 금지
- **Tailwind CSS ^4** (`@tailwindcss/postcss`)
- **Zod ^4** — API 응답 런타임 스키마 검증(`types/schemas/`)
- **Vitest ^4** + Testing Library + MSW — 단위/통합 테스트
- **Playwright ^1.62** — E2E(실제 브라우저 검증)

## 시작하기

```bash
pnpm install
cp .env.template .env.local   # NEXT_PUBLIC_API_BASE_URL 값을 채운다
pnpm dev                      # http://localhost:3000
```

### 환경변수

`.env.template`을 복사해 `.env.local`을 만들고 `NEXT_PUBLIC_API_BASE_URL`에 실제 API base URL을
채운다. 클라이언트 컴포넌트가 이 값을 직접 읽어 서드파티 API를 호출하는 구조라 `NEXT_PUBLIC_`
접두사가 필수다(서버 전용 프록시가 없다). 값이 없으면 `lib/api/config.ts`가 즉시 에러를 던진다 —
조용히 빈 문자열로 진행하지 않는다.

## 스크립트

| 스크립트 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버(Turbopack) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 빌드 결과 실행 |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest watch 모드(단위·통합) |
| `pnpm coverage` | Vitest 1회 실행 + 커버리지 리포트 |
| `pnpm test:e2e` | Playwright E2E(실제 Chromium) |

## 프로젝트 구조

```
app/                        App Router 페이지
  page.tsx                    목록(/)
  detail/[todoId]/page.tsx    상세(/detail/{id}), TodoDetailEditor.tsx
components/                 UI 컴포넌트
  Todo/section/                목록 섹션, 스켈레톤, 배지
  Todo/detail/                 상세 화면(이미지 박스, 메모 박스 등)
  addSection/ button/ empty/ gnb/ input/ status/
hooks/                       useTodoList · useTodoDetail · useImageUpload
                              — API 호출을 감싸며 절대 throw하지 않는다(실패는 error state로만 전달)
lib/
  api/                          client.ts(fetch 래퍼) · errors.ts(에러 계층) · todoApi.ts(엔드포인트 함수) · config.ts
  adapters/                     todoAdapter.ts — 서버 DTO ↔ 화면 도메인 타입 변환의 유일한 지점
  utils/                        parseTodoId · validateImageFile · cn
types/
  todo.ts                       화면 도메인 타입(Todo, TodoDetail)
  todo.dto.ts                   서버 DTO 타입
  schemas/                      zod 런타임 스키마
test/                        Vitest 단위·통합 테스트(27파일 200테스트) — 컴포넌트/훅/어댑터/유틸
e2e/                         Playwright E2E 테스트(5개 spec) — 실제 브라우저 전용 시나리오
```

## 테스트 구조 — `test/` (Vitest)와 `e2e/` (Playwright)가 분리된 이유

이 프로젝트는 테스트를 두 계층으로 나눈다. **경계는 이름 규칙이 아니라 디렉토리다** —
`vitest.config.mts`의 `include: ['test/**/*.{test,spec}.{ts,tsx}']`가 `test/` 디렉토리로
스코프를 좁혀 놓았기 때문에, `e2e/*.spec.ts`가 아무리 vitest의 파일명 패턴과 같아도 vitest가
절대 집어가지 않는다.

- **`test/**` (Vitest, jsdom)**: 컴포넌트 렌더링·훅 로직·어댑터·유틸리티 등 순수 로직 검증. 네트워크는
  MSW(`test/mocks/`)로 fetch 계층에서 목킹한다. 빠르고 결정적이지만 jsdom이 실제 브라우저 동작을
  전부 재현하지는 못한다.
- **`e2e/**` (Playwright, 실제 Chromium)**: jsdom으로는 검증할 수 없거나 신뢰할 수 없는, **브라우저
  전용 동작**만 겨냥한다. 이 프로젝트에서 실제로 부딪힌 사례:
  - React `use(params)` + Suspense가 jsdom에서는 재시도 결과를 DOM에 커밋하지 않는 문제가 있었다
    (`e2e/detail-routing.spec.ts`가 실제 브라우저에서 상세 페이지 진입을 검증).
  - `<input>`에서 Enter만 눌러 발생하는 폼 암묵적 제출은 jsdom이 구현하지 않는다
    (`e2e/add-todo-enter-submit.spec.ts`).
  - 스켈레톤/에러 배너 등 화면 상태 8종의 실제 레이아웃과, dev 모드 콘솔에만 뜨는 경고(예:
    `next/image` LCP·비율 경고)는 브라우저를 띄워야만 관측된다
    (`e2e/list-states.spec.ts`, `e2e/detail-upload-and-save.spec.ts`, `e2e/layout-regression.spec.ts`).

  즉 E2E는 Vitest가 이미 다루는 로직을 다시 검증하지 않는다 — 브라우저가 아니면 볼 수 없는 것만 본다.

## E2E 실행과 `page.route()` 목킹 정책

```bash
pnpm test:e2e
```

`playwright.config.ts`가 `webServer`로 `pnpm dev`(Next dev 서버, 포트 3000)를 자동 기동한다
(이미 떠 있으면 재사용). 브라우저는 chromium 하나만 설치되어 있다.

**모든 E2E 네트워크 요청은 `page.route()`로 목킹하고, 실제 외부 API는 절대 치지 않는다**
(`e2e/mocks/todoApi.ts`의 공유 헬퍼로 GET/POST/PATCH/DELETE/업로드를 목킹). 이유:

- 이 프로젝트의 API는 여러 사용자가 공유하는 테넌트다. 테스트가 실수로 실제 쓰기 요청을 보내면
  생성된 항목이 그대로 남고, 특히 업로드한 이미지는 **삭제 API 자체가 없어 영구적으로 남는다** —
  실행 후에 되돌릴 방법이 없다.
- 그래서 사후 로그 확인이 아니라 **사전 차단**을 택했다. `e2e/fixtures.ts`의 `blockRealApiRequests`
  자동 픽스처가 각 spec의 `page.route()` 목킹보다 먼저 등록되어 최후의 폴백 역할을 한다 — 어느
  목에도 매칭되지 않은 요청이 실제 API 오리진으로 나가면 그 요청을 즉시 `abort()`하고 테스트를
  실패시킨다. 이건 스펙이 짠 목킹을 대신하는 게 아니라, 목킹이 어긋났을 때의 안전망이다.

`e2e/fixtures.ts`는 콘솔 경고도 자동 수집한다(`collectConsoleWarnings`) — dev 모드에서 앱이 찍는
`warning`/`error` 콘솔 메시지 중 화이트리스트(React DevTools 안내, Fast Refresh 로그, 브라우저가
자동 생성하는 `Failed to load resource: ... status of N` 류) 밖의 메시지가 하나라도 있으면 테스트가
실패한다. `getByRole('alert')`를 쓸 때는 `e2e/selectors.ts`의 `appAlert()`를 쓴다 — Next.js가
모든 페이지에 라우트 안내용 `role="alert"` div를 항상 렌더하기 때문이다(자세한 이유는 `AGENTS.md`).

## 이번 릴리스에서 해소한 경고

정적 툴체인(`build`/`lint`/`vitest`)에서는 원래 경고가 3건뿐이었으나, Playwright로 실제 브라우저를
띄우면서 정적 도구로는 안 보이던 런타임 경고도 함께 발견해 처리했다.

| 경고 | 원인 | 처리 |
|---|---|---|
| W-1 | `pnpm lint`가 `coverage/` 산출물까지 검사(`eslint.config.mjs`의 `globalIgnores`에 `coverage/**` 누락) | `globalIgnores`에 `coverage/**` 추가 |
| W-2/W-3 | `vitest.config.mts`가 `__dirname`(네이티브 configLoader 비호환)과 `vite-tsconfig-paths` 플러그인(Vite 네이티브 `resolve.tsconfigPaths`로 대체 가능) 사용 | `__dirname` → `import.meta.dirname`, 플러그인 제거 → `resolve.tsconfigPaths: true` |
| (E2E가 발견) | dev 모드 브라우저 콘솔에서만 뜨는 `next/image` LCP 경고 + width/height 중 한쪽만 선언과 렌더 결과가 어긋나는 비율 경고 | 이미지 컴포넌트의 `width`/`height`를 원본 픽셀 그대로 선언하고 표시 크기는 CSS(`h-10 w-auto` 등)로 지정 — 자세한 원인은 `AGENTS.md` 참조 |

현재 상태: `pnpm lint` 경고 0 · `pnpm build` 경고 0 · Vitest 27파일 200테스트 통과 · Playwright
5개 spec 15개 테스트 통과.

## 배포

Vercel 등 Next.js를 지원하는 플랫폼에 배포할 수 있다. 배포 전 `.env` 값(`NEXT_PUBLIC_API_BASE_URL`)을
호스팅 환경변수로 등록해야 한다.
