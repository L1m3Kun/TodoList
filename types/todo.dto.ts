/**
 * Todo API DTO — 서버(assignment-todolist-api)가 주고받는 계약 형태 그대로다.
 *
 * `types/todo.ts`의 화면 도메인 타입(`Todo`·`TodoDetail`)과 의도적으로 분리한다.
 * 서버는 `name`·`isCompleted`를 쓰고 화면은 `todo`·`isFinish`를 쓴다 — 어느 한쪽에
 * 맞춰 다른 쪽을 왜곡하면 서버 응답과 타입이 어긋난다. 두 어휘 사이의 매핑은
 * 화면에 데이터를 연결하는 계층이 담당한다.
 *
 * 목록 응답과 상세 응답은 형태가 달라 별도 타입으로 유지한다.
 * 목록에는 memo·imageUrl이 없다 — TodoDetailDto와 절대 합치지 않는다.
 */

/** GET /items 목록 응답의 개별 항목 (memo·imageUrl 없음) */
export interface TodoSummaryDto {
  id: number;
  name: string;
  isCompleted: boolean;
}

/** GET/POST/PATCH /items(/:id) 상세 응답. memo·imageUrl은 서버가 null을 줄 수 있다. */
export interface TodoDetailDto {
  id: number;
  tenantId: string;
  name: string;
  memo: string | null;
  imageUrl: string | null;
  isCompleted: boolean;
}

/** POST /items 요청 바디 */
export interface CreateTodoInput {
  name: string;
}

/** PATCH /items/:id 요청 바디 — 전부 optional, 서버가 no-op을 허용한다 */
export type UpdateTodoInput = Partial<{
  name: string;
  memo: string;
  imageUrl: string;
  isCompleted: boolean;
}>;

/** DELETE /items/:id 응답 */
export interface DeleteResult {
  message: string;
}

/** POST /images/upload 응답 */
export interface UploadImageResult {
  url: string;
}
