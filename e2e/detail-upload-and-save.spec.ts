import { test, expect } from './fixtures';
import { mockTodoDetail, mockImageUpload, mockUpdateTodo } from './mocks/todoApi';
import type { TodoDetailDto } from '@/types/todo.dto';

/**
 * D-84 미검증 ③ 중 상세 화면 2종(plan.json ST-5):
 *  (a) 이미지 업로드 중 오버레이 + IconButton 비활성
 *  (b) 저장 버튼 disabled→enabled 전환 + 비활성 상태 강제 클릭 시 PATCH 미발생
 *
 * 두 시나리오 모두 draft.imageUrl이 끝까지 빈 값으로 유지되도록 설계했다 — 즉
 * `TodoImageBox`가 `<Image>`(next/image)를 한 번도 렌더하지 않는다. 이는 실제로
 * 확인한 콘솔 경고 위험 때문이다(자세한 근거는 result-ST-5.md):
 * `node_modules/next/dist/shared/lib/get-img-props.js`의 PerformanceObserver가
 * dev 모드에서 `loading="lazy"`(TodoImageBox의 기본값, priority 미지정) 이미지가
 * LCP 후보로 잡히면 `console.warn('...was detected as the Largest Contentful
 * Paint...')`를 낸다 — ST-1 콘솔 화이트리스트에 없는 신규 경고라 fixtures.ts의
 * `collectConsoleWarnings`가 테스트를 실패시킬 수 있다. (a)는 destruction
 * condition이 "지연 구간 중 조기 false"에 한정되므로, 업로드 완료(이미지가 실제로
 * 그려지는 시점)까지 기다리지 않아도 시나리오 요구를 그대로 충족한다.
 */

function makeDetail(overrides: Partial<TodoDetailDto> = {}): TodoDetailDto {
  return {
    id: 501,
    tenantId: 'e2e-tenant',
    name: '장보기',
    memo: '원래 메모',
    imageUrl: null,
    isCompleted: false,
    ...overrides,
  };
}

// 실제로 디코딩 가능한 이미지일 필요는 없다 — validateImageFile()(lib/utils/validateImageFile.ts)은
// file.type/file.size만 검사하고 콘텐츠는 보지 않는다. 1x1 투명 PNG.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test.describe('상세 화면 — 이미지 업로드 중 상태', () => {
  test('업로드 지연 구간 동안 오버레이가 보이고 IconButton이 비활성 상태를 유지한다', async ({
    page,
  }) => {
    const detail = makeDetail({ id: 501 });
    await mockTodoDetail(page, detail.id, detail);
    // 응답을 3초 지연시켜 "지연 구간"을 인위적으로 만든다. 이 구간 안에서만 단언하고,
    // 완료(응답 도착)까지는 기다리지 않는다 — 파일 상단 주석의 콘솔 경고 회피 근거 참조.
    await mockImageUpload(page, { delayMs: 3000 });

    await page.goto(`/detail/${detail.id}`);

    const addButton = page.getByTestId('add-icon-btn');
    // role="status" 오버레이는 업로드 중에만 조건부 렌더된다(TodoImageBox.tsx) — 텍스트로
    // 필터링해 role만으로는 잡힐 수 있는 다른 상태 배너와 혼동되지 않게 한다.
    const uploadingOverlay = page.getByRole('status').filter({ hasText: '업로드 중' });

    // 대조군: 업로드를 시작하기 전에는 오버레이가 없고 버튼이 활성 상태여야 한다.
    // 이게 실패하면 아래 "업로드 중" 단언이 애초에 의미 없는(상시 참인) 단언이 된다.
    await expect(uploadingOverlay).not.toBeVisible();
    await expect(addButton).toBeEnabled();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'todo-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
    });

    // 이 코드(useImageUpload의 isUploading)가 업로드 시작 직후 true가 되지 않거나,
    // seq 가드 버그로 지연 구간 안에서 조기에 false가 되면 이 단언이 실패한다.
    await expect(uploadingOverlay).toBeVisible();

    // 같은 지연 구간 안에서 TodoImageBox의 disabled={isUploading}이 IconButton에
    // 반영돼야 한다 — isUploading이 조기에 꺼지면(위와 동일한 파괴조건) 버튼이
    // 다시 눌리게 되어 이 단언이 실패한다.
    await expect(addButton).toBeDisabled();
  });
});

test.describe('상세 화면 — 저장 버튼 활성화 상태', () => {
  test('편집 전 disabled → 편집 후 enabled, 비활성 상태의 강제 클릭은 PATCH를 유발하지 않는다', async ({
    page,
  }) => {
    const detail = makeDetail({ id: 502, memo: '원래 메모' });
    await mockTodoDetail(page, detail.id, detail);

    // 헬퍼가 요청 카운터를 제공하지 않으므로(result-ST-1.md) page.on('request')로 직접 센다.
    let patchRequestCount = 0;
    page.on('request', (request) => {
      if (request.method() === 'PATCH') patchRequestCount += 1;
    });
    // 호출되지 않는 것이 기대치이지만, 혹시 호출되더라도 정상 응답을 주어 나머지 페이지
    // 렌더가 깨지지 않게 한다 — 호출 여부 판정은 위 카운터로만 한다(응답 성공 여부와 무관).
    await mockUpdateTodo(page, (id, body) => ({
      status: 200,
      body: { ...detail, ...body, id },
    }));

    await page.goto(`/detail/${detail.id}`);

    const saveButton = page.getByRole('button', { name: '수정 완료' });
    // 이 코드(TodoDetailEditor의 disabled={!isDirty || isSaving})가 깨져 초기부터
    // enabled가 되면(예: isDirty 초기값 계산 오류) 이 단언이 실패한다.
    await expect(saveButton).toBeDisabled();

    // 브라우저 네이티브 동작 확인(jsdom은 이 동작을 재현하지 않아 vitest로 검증 불가했던
    // 지점): 실제 disabled 버튼은 force 클릭을 시도해도 click 이벤트 자체가 발생하지 않는다.
    //
    // ⚠️ 클릭 직후 곧바로 카운터를 읽으면 안 된다(코드리뷰 지적). PATCH가 실제로 나가더라도
    // request 이벤트가 CDP를 거쳐 도달하기 전에 단언이 끝나버려 **깨진 코드도 통과**한다.
    // 관측 창을 명시적으로 확보한다 — 클릭 후 일정 시간 동안 PATCH를 기다렸다가
    // 오지 않았음을 단언한다.
    const patchWithinWindow = page
      .waitForRequest((request) => request.method() === 'PATCH', { timeout: 1000 })
      .then(() => 'fired' as const)
      .catch(() => 'none' as const);

    await saveButton.click({ force: true });

    // 이 코드(disabled 속성)가 깨져 강제 클릭이 실제로 처리되면 handleSave→PATCH가 나가
    // 'fired'가 되어 실패한다.
    expect(await patchWithinWindow).toBe('none');
    expect(patchRequestCount).toBe(0);

    const memoField = page.getByRole('textbox', { name: 'Memo' });
    await memoField.fill('수정된 메모');

    // 이 코드(toUpdateTodoInput의 memo 비교 → isDirty 파생)가 깨지면 편집 후에도
    // disabled가 풀리지 않아 이 단언이 실패한다.
    await expect(saveButton).toBeEnabled();

    // enabled로 전환된 것 자체가 PATCH를 발생시키지 않아야 한다(아직 저장 버튼을
    // 실제로 클릭하지 않았다 — 이 스펙은 disabled 게이팅만 검증하고 저장 흐름 자체는
    // 검증 범위 밖이다).
    expect(patchRequestCount).toBe(0);
  });
});
