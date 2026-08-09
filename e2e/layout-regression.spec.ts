import type { Locator, Page } from '@playwright/test';

import { test, expect } from './fixtures';
import { mockImageUpload, mockTodoDetail, mockTodoList, mockUpdateTodo } from './mocks/todoApi';
import type { TodoDetailDto, TodoSummaryDto } from '@/types/todo.dto';
import { appAlert, appStatus } from './selectors';

/**
 * D-84 미검증 ④(레이아웃 회귀) + M-5(업로드 오버레이 z-index) 검증.
 *
 * 스크린샷 픽셀 diff 대신 `boundingBox()`/`elementFromPoint()` 기반 구조적 단언만 쓴다
 * (architecture.standards). 각 시나리오는 "무엇이 깨지면 실패하는가"가 명확해야 하므로
 * 핵심 expect 바로 위에 파괴조건을 한국어 주석으로 남긴다.
 */

/** 좌표 비교(위치가 같아야 하는 경우)에 허용하는 오차. 서브픽셀 렌더링 오차를 흡수하되,
 *  D-84가 겨냥한 "레이아웃 점프"(보통 수십 px)와는 확실히 구분되는 작은 값을 쓴다. */
const POSITION_TOLERANCE_PX = 2;

/** 스켈레톤 행과 실제 TodoItem 행은 둘 다 `h-12.5`(고정 50px, border-box) Tailwind
 *  유틸리티를 그대로 쓰므로(TodoListSkeleton.tsx 주석 참조) 이론상 오차가 없어야 한다.
 *  그래도 완전한 0 비교는 엔진 간 subpixel 반올림에 플레이키할 수 있어 1px만 허용한다. */
const ROW_HEIGHT_TOLERANCE_PX = 1;

/** (c)에서 "이미 이미지가 첨부된 상세"를 만들 때 쓰는 URL. 실제로 요청이 나가지 않도록
 *  같은 테스트에서 `page.route()`로 반드시 가로챈다. */
const EXISTING_IMAGE_URL = 'https://example.com/existing-image.png';

/** 1×1 투명 PNG. 위 URL을 로컬에서 충족시키기 위한 최소 바이트열. */
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function buildIncompleteTodoItems(count: number): TodoSummaryDto[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `레이아웃 테스트 항목 ${index + 1}`,
    isCompleted: false,
  }));
}

async function requireBoundingBox(locator: Locator): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`boundingBox()가 null입니다: ${locator.toString()}`);
  return box;
}

/** TodoListSkeleton의 첫 번째 placeholder 행. 스켈레톤 전체는 `aria-hidden="true"`로
 *  감싸여 있고(a11y용 도피 표기), 목록 페이지에서 이 속성을 가진 div는 스켈레톤
 *  래퍼뿐이다 — `.first()`는 'todo' 변형(먼저 렌더되는 섹션)의 스켈레톤을 가리킨다. */
function firstSkeletonRow(page: Page): Locator {
  return page.locator('div[aria-hidden="true"]').first().locator('> div').first();
}

/** 실제로 렌더된 첫 번째 TodoItem 행. 새 data-testid를 추가할 수 없으므로(표준 §6),
 *  이미 접근성 이름이 붙어 있는 완료 토글 버튼을 앵커로 삼아 그 부모(TodoItem 루트
 *  div, `h-12.5`)를 얻는다 — 클래스 문자열이 아니라 접근 가능한 이름으로 찾는다. */
function firstTodoItemRow(page: Page): Locator {
  return page.getByRole('button', { name: '완료로 표시' }).first().locator('xpath=..');
}

test.describe('레이아웃 회귀 — 스켈레톤 · 배너 · 업로드 오버레이 z-order', () => {
  test('(a) 스켈레톤 로딩이 끝나도 레이아웃이 점프하지 않는다', async ({ page }) => {
    const items = buildIncompleteTodoItems(2);
    // 목록 응답을 지연시켜 스켈레톤 상태를 관측할 시간을 확보한다(함정: 지연이 짧으면
    // 응답이 관측 전에 도착해 스켈레톤을 못 잡는다).
    await mockTodoList(page, items, { delayMs: 1500 });
    await page.goto('/');

    // 좌표를 재기 전에 스켈레톤 가시성을 먼저 확정한다(레이스 방지).
    const skeletonRow = firstSkeletonRow(page);
    await expect(skeletonRow).toBeVisible();

    const addSectionInput = page.getByPlaceholder('할 일을 입력해주세요');
    const addSectionBoxDuringLoading = await requireBoundingBox(addSectionInput);
    const skeletonRowBox = await requireBoundingBox(skeletonRow);

    // 실제 목록이 커밋될 때까지 대기(스켈레톤 → 첫 항목으로 전환됨을 직접 확인).
    const firstItemLink = page.getByRole('link', { name: items[0].name });
    await expect(firstItemLink).toBeVisible();

    const addSectionBoxAfterLoad = await requireBoundingBox(addSectionInput);
    const itemRowBox = await requireBoundingBox(firstTodoItemRow(page));

    // 보조 단언: AddSection은 이 페이지에서 스켈레톤/목록보다 항상 앞서 렌더되는
    // 최상단 요소라 스켈레톤 높이가 달라져도 이 좌표 자체는 구조적으로 움직이지
    // 않는다. 그래도 페이지 상단에 새 요소가 끼어드는 등 다른 회귀가 생기면 여기서
    // 잡힌다(약하지만 유효한 안전망).
    expect(
      Math.abs(addSectionBoxAfterLoad.y - addSectionBoxDuringLoading.y),
      'AddSection의 Y좌표가 로딩 전후로 달라졌다',
    ).toBeLessThanOrEqual(POSITION_TOLERANCE_PX);

    // 핵심 단언: 이 코드가 깨지면(TodoListSkeleton의 행 높이 클래스가 실제 TodoItem의
    // h-12.5와 달라지면) 두 행의 렌더 높이가 벌어져 이 단언이 실패한다 — 이것이
    // "스켈레톤이 실제 TodoSection과 다른 높이로 렌더되면 레이아웃이 점프한다"는
    // 파괴조건을 직접 담보하는 단언이다(AddSection 좌표만으로는 이 페이지 구조상
    // 절대 이 회귀를 못 잡는다 — AddSection이 항상 목록보다 위에 있기 때문. 자세한
    // 판단 근거는 result-ST-6.md 참조).
    expect(
      Math.abs(itemRowBox.height - skeletonRowBox.height),
      '스켈레톤 행 높이와 실제 TodoItem 행 높이가 다르다',
    ).toBeLessThanOrEqual(ROW_HEIGHT_TOLERANCE_PX);
  });

  test('(b) 뮤테이션 실패 배너가 TodoSection을 덮지 않는다', async ({ page }) => {
    const items = buildIncompleteTodoItems(1);
    await mockTodoList(page, items);
    // 토글(PATCH)을 실패시켜 items는 유지된 채(showErrorOnly=false) 배너만 뜨는
    // 상태를 만든다 — ST-4(d)와 상황은 겹치지만 관심사는 "겹치지 않는가"로 다르다.
    await mockUpdateTodo(page, () => ({
      status: 500,
      body: { message: '상태 변경에 실패했습니다.' },
    }));
    await page.goto('/');

    const toggleButton = page.getByRole('button', { name: '완료로 표시' });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    const banner = appAlert(page);
    await expect(banner).toBeVisible();

    const bannerBox = await requireBoundingBox(banner);
    // TodoSection 컨테이너의 상단 경계 대용으로, 그 안에서 가장 먼저 렌더되는
    // 접근 가능한 요소(진행도 배지 이미지)의 Y좌표를 쓴다(alt 텍스트는 두 섹션
    // 공통이라 `.first()`로 'todo' 섹션 — DOM 순서상 먼저 — 을 가리킨다).
    const todoSectionTop = (
      await requireBoundingBox(page.getByAltText('할 일 진행도 태그').first())
    ).y;
    const bannerBottom = bannerBox.y + bannerBox.height;

    // 파괴조건: 배너가 position:absolute로 아래 내용을 덮어씌우는 회귀가 생기면
    // bannerBottom이 todoSectionTop을 넘어서 이 단언이 실패한다.
    expect(
      bannerBottom,
      '뮤테이션 배너의 bottom이 TodoSection 컨테이너의 top과 겹친다',
    ).toBeLessThanOrEqual(todoSectionTop + POSITION_TOLERANCE_PX);
  });

  test('(c) M-5 회귀 — 업로드 중에도 오버레이가 IconButton보다 위에 그려진다', async ({
    page,
  }) => {
    const id = 1;
    const detail: TodoDetailDto = {
      id,
      tenantId: 'e2e-tenant',
      name: '이미지가 있는 할 일',
      memo: null,
      imageUrl: EXISTING_IMAGE_URL,
      isCompleted: false,
    };
    // ⚠️ 이 imageUrl은 next/image가 unoptimized로 렌더해 **브라우저가 직접 요청**한다.
    // 목킹하지 않으면 실제 example.com으로 요청이 나가고(실측 404), 그 콘솔 에러가
    // 화이트리스트에 삼켜져 "초록인데 외부로 새는" 상태가 된다. 온라인/오프라인에 따라
    // 결과가 갈리는 테스트이기도 하다. 로컬 픽셀로 가로채 결정론적으로 만든다.
    await page.route(EXISTING_IMAGE_URL, (route) =>
      route.fulfill({ contentType: 'image/png', body: TRANSPARENT_PNG }),
    );
    await mockTodoDetail(page, id, detail);
    // 업로드 응답을 지연시켜 isUploading=true 구간을 관측할 시간을 확보한다.
    await mockImageUpload(page, { delayMs: 1500 });
    await page.goto(`/detail/${id}`);

    // imageUrl이 있으므로 IconButton은 'edit' variant(data-testid="edit-icon-btn")로
    // 렌더된다 — 상세 데이터가 실제로 커밋됐음을 이 요소로 확인한다.
    const editIconButton = page.getByTestId('edit-icon-btn');
    await expect(editIconButton).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    });

    // 좌표를 재기 전에 업로드 오버레이 가시성을 먼저 확정한다(레이스 방지).
    const uploadOverlay = appStatus(page, '업로드 중');
    await expect(uploadOverlay).toBeVisible();

    const iconBox = await requireBoundingBox(editIconButton);
    const centerX = iconBox.x + iconBox.width / 2;
    const centerY = iconBox.y + iconBox.height / 2;

    // 파괴조건: ST-0의 z-20 수정이 되돌려지거나 오버레이가 다시 z-index:auto가 되면,
    // IconButton 래퍼(z-10)가 DOM 순서와 무관하게 오버레이보다 위에 그려져 같은
    // 좌표의 최상단 요소가 오버레이(role="status") 밖의 요소가 된다 — 그러면
    // closest('[role="status"]')가 null이 되어 이 단언이 실패한다.
    const topElementIsInsideOverlay = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('[role="status"]') !== null,
      [centerX, centerY] as [number, number],
    );
    expect(
      topElementIsInsideOverlay,
      '업로드 오버레이 중심 좌표의 최상단 요소가 오버레이(role="status") 밖에 있다',
    ).toBe(true);
  });
});
