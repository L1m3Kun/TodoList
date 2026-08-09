import { test, expect } from './fixtures';
import { mockTodoList, mockCreateTodo } from './mocks/todoApi';
import type { TodoSummaryDto, TodoDetailDto } from '@/types/todo.dto';

/**
 * D-84 미검증 ② — Enter 암묵적 폼 제출.
 *
 * jsdom은 브라우저의 "폼 안 텍스트 입력에서 Enter → 활성화된 submit 버튼 클릭"
 * 암묵적 제출 동작을 구현하지 않는다(D-84 실측). 그래서 기존 vitest 테스트는
 * `form.requestSubmit()`으로 이 경로를 우회해 검증했고, 실제 Enter 키 이벤트가
 * `AddSection`의 `<form onSubmit>`까지 이어지는지는 아무도 확인한 적이 없다.
 *
 * 이 스펙은 그 우회를 절대 쓰지 않는다 — `locator.press('Enter')`로 실제 키
 * 이벤트만 발생시킨다. `form.requestSubmit()`/`dispatchEvent`를 쓰는 순간 기존
 * vitest가 이미 검증한 경로를 다시 도는 것이므로 이 테스트의 존재 이유가 사라진다.
 */

// GET /items가 참조하는 배열. mockTodoList는 이 배열을 클로저로 캡처해 응답에
// 그대로 쓰므로(참조 공유, 값 복사 아님), POST 성공 시 이 배열에 새 항목을 밀어
// 넣으면 그 뒤에 나가는 refetch()의 GET 응답에도 반영된다.
const items: TodoSummaryDto[] = [];

const NEW_TODO_NAME = 'Enter 제출 테스트 항목';

test('입력창에서 Enter만 눌러도(버튼 클릭 없이) 할 일이 추가된다', async ({ page }) => {
  await mockTodoList(page, items);

  // 실제 나간 POST /items 요청 수를 직접 센다(헬퍼는 카운터를 제공하지 않는다 — result-ST-1.md).
  let postRequestCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/items')) {
      postRequestCount += 1;
    }
  });

  await mockCreateTodo(page, (requestBody) => {
    const created: TodoDetailDto = {
      id: 1,
      tenantId: 'e2e-enter-submit',
      name: requestBody.name,
      memo: null,
      imageUrl: null,
      isCompleted: false,
    };
    // 목록 refetch가 새 항목을 돌려주도록 공유 배열을 갱신한다(위 주석 참조).
    items.push({ id: created.id, name: created.name, isCompleted: created.isCompleted });
    return { status: 201, body: created };
  });

  await page.goto('/');

  const input = page.getByPlaceholder('할 일을 입력해주세요');
  await input.click();
  await input.fill(NEW_TODO_NAME);

  // Enter를 누르기 전에 먼저 응답 대기를 걸어야 한다 — press() 이후에 걸면
  // 이미 끝난 요청을 놓칠 수 있다.
  const postResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().endsWith('/items')
  );

  // 버튼을 클릭하지 않는다. 실제 키 이벤트만으로 폼 암묵적 제출을 트리거한다 —
  // AddSection의 <form onSubmit>이 깨지거나 Input이 진짜 <input>이 아니게 되면
  // (혹은 Button의 type이 'submit'으로 렌더되지 않으면) 이 Enter는 아무 일도
  // 일으키지 않는다.
  await input.press('Enter');
  await postResponsePromise;

  // ① AddSection의 <form onSubmit>이 깨지거나 Input이 실제 <input>이 아니게 되면
  // Enter가 암묵적 제출을 트리거하지 못해 POST가 전혀 나가지 않고 이 카운트가 0으로 남는다.
  expect(postRequestCount).toBeGreaterThanOrEqual(1);

  // ② handleSubmit이 성공(ok===true) 시 setValue('')를 호출하는 경로가 깨지면
  // 입력값이 지워지지 않고 그대로 남는다.
  await expect(input).toHaveValue('');

  // ③ createTodo 성공 후 refetch()가 GET /items를 다시 불러 목킹 응답의 새 항목을
  // 반영하는 경로(useTodoList → toTodo 어댑터 → TodoSection → TodoItem)가 깨지면
  // 이 텍스트가 화면에 나타나지 않는다.
  await expect(page.getByText(NEW_TODO_NAME)).toBeVisible();
});
