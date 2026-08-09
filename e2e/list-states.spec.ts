import { test, expect } from './fixtures';
import { mockTodoList, mockUpdateTodo } from './mocks/todoApi';
import { appAlert } from './selectors';

/**
 * D-84 미검증 ③ 중 목록 화면 4종(로딩·빈 목록·목록 에러·뮤테이션 배너)을 검증한다.
 *
 * (c)와 (d)의 차이가 이 spec의 핵심이다: 둘 다 에러 상태지만 `app/page.tsx`의
 * `showErrorOnly`(= errorMessage!==null && items.length===0) 판정에 따라
 * (c)는 TodoSection 자리를 통째로 대체하고, (d)는 TodoSection 위에 배너로만 얹힌다.
 * 이 두 파일이 서로 다른 조건 분기를 타는지가 진짜 테스트 대상이다 — D-85(하위 컴포넌트
 * 방어코드가 상위 결함을 가리는 유형)를 피하기 위해, 여기서 확인하는 것은 전부
 * page.tsx의 조건부 렌더 자체(있다/없다)이지 하위 컴포넌트의 내부 폴백이 아니다.
 */

// HttpError.message는 서버가 보낸 errorBody.message(=serverMessage)가 아니라
// lib/api/errors.ts의 mapStatusToUserMessage(status) 매핑값이다(S-4 — 서버 원문 비노출).
// status>=500 목킹 시 화면에는 항상 이 문구가 뜬다.
const SERVER_ERROR_MESSAGE = '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';

const SAMPLE_ITEM = { id: 1, name: '테스트 할 일', isCompleted: false };

// TodoListSkeleton.tsx의 SKELETON_ROW_COUNT(3) × TodoSection 2개(TODO/DONE).
const SKELETON_ROW_TOTAL = 6;

test.describe('목록 화면 상태', () => {
  test('(a) 로딩 중에는 TodoListSkeleton이 보이고, 응답 후 사라진다', async ({ page }) => {
    // GET /items 응답을 지연시켜 로딩 구간을 인위적으로 늘린다.
    await mockTodoList(page, [SAMPLE_ITEM], { delayMs: 1500 });
    await page.goto('/');

    // 파괴조건: app/page.tsx의 isInitialLoading(=isLoading && items.length===0) 계산이
    // 깨지면(예: 조건 오기입, 상수 반전) 스켈레톤 행이 애초에 렌더되지 않아 이 단언이
    // 실패한다. animate-pulse는 TodoListSkeleton에만 쓰이는 클래스다.
    await expect(page.locator('.animate-pulse')).toHaveCount(SKELETON_ROW_TOTAL);

    // 응답이 도착하면 스켈레톤이 사라지고 실제 항목이 렌더된다 — 로딩 상태가
    // 영원히 고착되는 회귀(예: isLoading이 false로 안 떨어짐)를 함께 잡는다.
    await expect(page.getByText(SAMPLE_ITEM.name)).toBeVisible();
    await expect(page.locator('.animate-pulse')).toHaveCount(0);
  });

  test('(b) 빈 목록은 크래시 없이 TODO/DONE 0개 상태로 렌더된다', async ({ page }) => {
    await mockTodoList(page, []);
    await page.goto('/');

    // 파괴조건: items===[]일 때 TodoSection/TodoList가 배열 접근 등으로 크래시하면
    // (예: todos[0] 직접 접근) 아래 empty 텍스트 대신 Next 에러 오버레이가 뜨거나
    // 페이지가 빈 화면이 되어 이 단언들이 타임아웃으로 실패한다.
    await expect(page.getByText('할 일이 없어요.')).toBeVisible();
    await expect(page.getByText('아직 다 한 일이 없어요.')).toBeVisible();
  });

  test('(c) 목록 에러는 섹션 자리를 통째로 대체하고, 재시도로 복구된다', async ({ page }) => {
    await mockTodoList(page, [], { status: 500 });
    await page.goto('/');

    const errorAlert = appAlert(page);
    const retryButton = page.getByRole('button', { name: '다시 시도' });

    // showErrorOnly(=errorMessage!==null && items.length===0)가 true일 때
    // StatusMessage가 role="alert"로 렌더된다.
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(SERVER_ERROR_MESSAGE);
    await expect(retryButton).toBeVisible();

    // 파괴조건(AD-8 showErrorOnly 분기): 이 값이 깨져 에러와 빈 섹션이 동시에 뜨면
    // TodoSection의 배지 이미지(양쪽 섹션 공통 alt)가 남아있어 개수가 0이 아니게 된다 —
    // "에러 카드가 섹션 자리를 통째로 대체한다"는 요구를 정확히 겨냥한 단언이다.
    await expect(page.getByAltText('할 일 진행도 태그')).toHaveCount(0);

    // 재시도 목을 성공으로 교체한 뒤 클릭한다.
    await mockTodoList(page, [SAMPLE_ITEM]);
    await retryButton.click();

    // 파괴조건: retry 핸들러(refetch)가 재요청을 안 부르면(예: onClick 미연결) 아래
    // 단언이 새 목킹 데이터를 영원히 못 보고 타임아웃으로 실패한다.
    await expect(page.getByText(SAMPLE_ITEM.name)).toBeVisible();
    // 정상 목록 복귀 후에는 에러 카드가 사라지고 섹션이 다시 렌더된다.
    await expect(errorAlert).toHaveCount(0);
    await expect(page.getByAltText('할 일 진행도 태그')).toHaveCount(2);
  });

  test('(d) 뮤테이션 실패는 기존 목록을 지우지 않고 배너로만 얹힌다', async ({ page }) => {
    // 초기 GET은 성공(항목 1개 이상)해야 뮤테이션 배너 시나리오가 성립한다.
    await mockTodoList(page, [SAMPLE_ITEM]);
    await page.goto('/');
    await expect(page.getByText(SAMPLE_ITEM.name)).toBeVisible();

    // 이후 PATCH만 실패로 목킹한다.
    await mockUpdateTodo(page, () => ({
      status: 500,
      body: { message: '상태 변경에 실패했습니다.' },
    }));

    const checkbox = page.getByRole('button', { name: '완료로 표시' });
    await checkbox.click();

    // 파괴조건(핵심): showErrorOnly 판정 기준이 `items.length===0` 대신
    // `errorMessage!==null`만 보게 퇴행하면, 데이터가 있는데도(items.length===1)
    // 섹션 전체가 사라져 아래 목록 관련 단언들이 실패한다. (c)와 달리 여기서는
    // 배너와 목록이 "동시에" 존재해야 정상이다.
    const errorAlert = appAlert(page);
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(SERVER_ERROR_MESSAGE);

    // 배너가 뜨는 동안에도 기존 항목과 TodoSection 자체(배지)는 그대로 남아있어야 한다.
    await expect(page.getByText(SAMPLE_ITEM.name)).toBeVisible();
    await expect(checkbox).toBeVisible();
    await expect(page.getByAltText('할 일 진행도 태그')).toHaveCount(2);
  });
});
