<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 이 레포에서 알아야 할 것

## 아키텍처 요약

- **훅은 절대 throw하지 않는다.** `useTodoList` · `useTodoDetail` · `useImageUpload` 셋 다 실패를
  `error` state와 반환값(`null`/`false`)으로만 알린다. 새 훅을 추가하거나 기존 훅을 수정할 때 이
  계약을 깨지 마라 — 소비자(페이지)는 try/catch 없이 반환값만 확인하는 전제로 짜여 있다.
- **에러 계층**: `lib/api/errors.ts`의 `ApiError` 베이스를 `NetworkError` / `HttpError` /
  `ValidationError` 3종이 상속한다. `request()`(`lib/api/client.ts`)는 이 3종 외의 예외를 던지지
  않는다. `HttpError.message`는 상태코드 기반으로 매핑한 **안전한 사용자 표시 문구**이고, 서버가
  실제로 보낸 원문은 `serverMessage`에만 보존된다 — 화면에는 `error.message`만 노출하고
  `serverMessage`/`details`를 절대 렌더하지 마라(과거 원시 서버 스택이 새어나간 사고가 있었다).
- **DTO ↔ 화면 타입 변환은 `lib/adapters/todoAdapter.ts` 한 곳뿐이다.** 서버 어휘(`name`,
  `isCompleted`, DTO의 `null`)와 화면 어휘(`todo`, `isFinish`, 빈 문자열 정규화)가 다르다. 컴포넌트나
  훅에서 직접 DTO 필드를 읽거나 임의로 변환하지 마라 — 이 모듈을 거쳐야 한다.

## 테스트 소유 경계 — `test/`(Vitest) vs `e2e/`(Playwright)

- `vitest.config.mts`의 `include`가 `test/**/*.{test,spec}.{ts,tsx}`로 **디렉토리 자체를**
  스코프로 잡는다. `e2e/*.spec.ts`는 파일명이 같은 패턴이어도 vitest가 절대 집어가지 않는다 —
  이름 규칙이 아니라 디렉토리가 경계다. 새 테스트를 추가할 때 이 경계를 벗어난 위치에 두지 마라.
- `test/`는 MSW(`test/mocks/`)로 네트워크를 목킹하는 jsdom 환경. `e2e/`는 실제 Chromium +
  `page.route()` 목킹. 같은 시나리오를 두 계층에 중복으로 만들지 마라 — E2E는 jsdom이 재현 못
  하거나 신뢰 못 하는 브라우저 전용 동작(아래 항목들)만 겨냥한다.

## `getByRole('alert')` 함정

Next.js가 모든 페이지에 라우트 안내용 `<div role="alert" id="__next-route-announcer__">`를
**항상** 렌더한다(내용은 비어 있지만 role은 그대로 잡힌다). 그래서 `page.getByRole('alert')`를
그대로 쓰면 앱의 에러 `StatusMessage`(`role="alert"`)와 합쳐 2개로 잡혀 Playwright strict mode
위반이 난다. 이 함정은 실제로 spec 5개 중 4개가 각자 독립적으로 밟았다 — 개별 우회 대신
`e2e/selectors.ts`의 헬퍼를 써라:

```ts
import { appAlert, appStatus } from './selectors';

await expect(appAlert(page)).toContainText('...');       // role="alert" (Next 어나운서 제외)
await expect(appStatus(page, '업로드 중')).toBeVisible(); // role="status", 텍스트로 특정
```

`getByRole('status', { name })`도 쓰지 마라 — `role="status"`의 accessible name은 author 지정
(`aria-label`/`aria-labelledby`) 전용이라 본문 텍스트로 매칭되지 않는다. `appStatus()`는
`filter({ hasText })`로 이 문제를 우회한다.

## `next/image` 비율 경고 — XOR 판정

`next/image`는 **선언한 `width`/`height`와 실제 렌더 치수 중 한쪽만** 어긋날 때 경고한다
(`node_modules/next/dist/client/image-component.js`의 판정식 — `heightModified XOR widthModified`).
양쪽이 다 어긋나거나 다 일치하면 조용하다. 즉 `<picture>`의 아트 디렉션처럼 화면 크기별로 다른
원본 이미지를 그리는 경우, `width`/`height`를 표시 크기에 맞춰 선언하면 브레이크포인트에 따라
한쪽만 어긋나는 상황이 생겨 경고가 뜬다.

**해법**: 선언은 항상 **원본 이미지의 실제 픽셀 크기 그대로** 두고, 화면에 보이는 크기는 CSS로만
지정한다(`className="h-10 w-auto"` 같은 식). 그러면 표시 크기가 뭐든 두 치수가 **항상 함께**
어긋나거나 함께 일치해 XOR이 깨진다. `components/gnb/GlobalNavBar.tsx`(`<picture>` + `next/image`
아트 디렉션)와 `components/Todo/section/TodoSection.tsx`(배지) 양쪽에 이미 이 패턴이 적용돼 있다 —
참고해서 따라라. 평문 `<img>`로 우회하지 마라(eslint `@next/next/no-img-element` 경고로 바뀔 뿐이다).

## E2E는 실제 API를 절대 치지 않는다

이 프로젝트의 API는 여러 사용자가 공유하는 테넌트이고, 업로드한 이미지는 **삭제 API가 없어
영구적으로 남는다**. E2E가 실수로 실제 쓰기 요청을 보내면 되돌릴 방법이 없다. 그래서:

- 모든 E2E 네트워크는 `e2e/mocks/todoApi.ts`의 공유 헬퍼(`mockTodoList`/`mockTodoDetail`/
  `mockCreateTodo`/`mockUpdateTodo`/`mockDeleteTodo`/`mockImageUpload`)로 목킹한다. 목킹 URL은
  하드코딩 문자열이 아니라 `.env.local`의 `NEXT_PUBLIC_API_BASE_URL`을 predicate로 사용한다.
- `e2e/fixtures.ts`의 `blockRealApiRequests`(auto 픽스처)가 스펙의 목킹보다 먼저 등록돼 최후의
  폴백이 된다 — 어느 목에도 안 걸린 요청이 실제 API 오리진으로 나가면 즉시 `abort()`하고 테스트를
  실패시킨다. 이건 목킹을 대신하는 게 아니라 목킹이 어긋났을 때의 안전망이다 — 새 spec을 쓸 때도
  이 가드에 의존하지 말고 반드시 필요한 요청을 직접 목킹해라.

## 콘솔 경고는 테스트 실패 조건이다 — 화이트리스트를 함부로 늘리지 마라

`e2e/fixtures.ts`의 `collectConsoleWarnings`(auto 픽스처)가 모든 E2E 테스트에서 dev 모드 콘솔의
`warning`/`error` 메시지를 수집하고, 화이트리스트(`CONSOLE_WHITELIST_PATTERNS`) 밖 메시지가 하나라도
있으면 그 테스트를 실패시킨다. 이 픽스처가 실제로 계획에 없던 `next/image` 경고를 찾아낸 적이 있다
— **정적 툴체인(`lint`/`build`/`vitest`)만으로는 못 보는 런타임 경고를 잡는 것이 이 픽스처의 존재
이유**다.

- 화이트리스트에 넣을 수 있는 건 **우리 코드와 무관한 프레임워크/브라우저 자체 잡음뿐**이다(React
  DevTools 안내, Fast Refresh 로그, 브라우저가 non-2xx 응답에 자동으로 찍는
  `Failed to load resource: ... status of N`).
- 앱 코드가 실제로 찍는 경고(예: `next/image` 비율 경고)를 화이트리스트로 덮어 숨기지 마라 — 그건
  경고를 없앤 게 아니라 안 보이게 만든 것뿐이다. 원인을 고쳐라(위 "next/image 비율 경고" 참조).
- 의도적으로 콘솔 warning/error를 유발하는 새 시나리오가 필요해지면, 임의로 화이트리스트 패턴을
  넓히지 말고 그 필요성을 먼저 검토해라.

## 가짜 테스트 3연전 패턴 — 반복하지 말 것

이 레포는 "통과하지만 아무것도 지키지 않는 테스트"를 세 번 만든 적이 있다:

1. 5MB 파일 크기 상한 테스트가 테스트 대상 모듈의 상수를 그대로 import해 기대값을 계산 —
   상수가 잘못 바뀌어도 테스트는 항상 통과했다(자기참조).
2. 발생할 수 없는 이벤트가 "일어나지 않았음"을 확인하는 부정 단언 — 가드를 완전히 꺼도 통과했다.
3. 하위 컴포넌트의 방어 코드(`?? ''` 같은 fallback)가 상위 로직의 결함을 가려, 상위가 깨져도
   테스트가 안 잡았다.

**재발 방지 원칙**: 새 테스트(단위·E2E 모두)를 쓸 때 "이 코드가 깨지면 왜 이 단언이 실패하는가"를
스스로 답할 수 있어야 한다. E2E 표준(`architecture.standards`)은 핵심 `expect` 바로 위에 그 근거를
한국어 주석으로 남기도록 요구한다 — 이 관행을 계속 지켜라. 상수 비교 테스트를 쓸 때는 대상 모듈의
상수를 import해 그 값으로 기대값을 계산하지 말고 리터럴 값을 직접 적어라(그래야 상수가 잘못
바뀌면 테스트가 실제로 깨진다). 구조적 상태 변화(섹션이 렌더되는지/안 되는지 같은 boolean 게이트)를
검증할 때는 텍스트 내용보다 존재/개수 같은 구조적 신호를 우선하면 하위 방어 코드에 가려질 여지가
줄어든다.

