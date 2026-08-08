/**
 * Todo 도메인 타입 — API 계약 이름을 그대로 쓴다(name/isCompleted/tenantId, D-46).
 * UI 이름(todo/isFinish)으로 매핑하지 않는다.
 *
 * 목록 응답과 상세 응답은 별도 타입으로 유지한다(SERVICE.md 함정 1).
 * 목록에는 memo/imageUrl이 없다 — TodoDetail과 절대 합치지 않는다.
 */

/** GET /items 목록 응답의 개별 항목 (memo·imageUrl 없음) */
export interface TodoSummary {
  id: number;
  name: string;
  isCompleted: boolean;
}

/** GET/POST/PATCH /items(/:id) 상세 응답. memo·imageUrl은 서버가 null을 줄 수 있다(함정 2). */
export interface TodoDetail {
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
