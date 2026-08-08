import { z } from 'zod';
import type {
  TodoSummaryDto,
  TodoDetailDto,
  CreateTodoInput,
  UpdateTodoInput,
  DeleteResult,
  UploadImageResult,
} from '@/types/todo.dto';

/**
 * Todo 도메인 타입에 대응하는 zod 런타임 스키마.
 *
 * memo·imageUrl은 반드시 .nullable() — api-spec.json의 Item 스키마는
 * nullable:true인데 상세 응답 인라인 스키마엔 표기가 없는 자기모순이 있다(함정 2).
 * 런타임 null을 항상 전제한다.
 */

export const todoSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  isCompleted: z.boolean(),
});

export const todoDetailSchema = z.object({
  id: z.number(),
  tenantId: z.string(),
  name: z.string(),
  memo: z.string().nullable(),
  imageUrl: z.string().nullable(),
  isCompleted: z.boolean(),
});

export const todoSummaryListSchema = z.array(todoSummarySchema);

export const createTodoInputSchema = z.object({
  name: z.string().min(1),
});

// 전부 optional — 최소 1개 필드 요구는 강제하지 않는다(서버가 no-op 허용).
export const updateTodoInputSchema = z.object({
  name: z.string().optional(),
  memo: z.string().optional(),
  imageUrl: z.string().optional(),
  isCompleted: z.boolean().optional(),
});

export const deleteResultSchema = z.object({
  message: z.string(),
});

export const uploadImageResultSchema = z.object({
  url: z.string(),
});

/**
 * 타입 레벨 고정: types/todo.ts의 도메인 타입과 스키마 추론 타입이
 * 구조적으로 어긋나면 이 파일 자체가 컴파일 실패하도록 강제한다.
 * (as T 단언으로 zod parse를 대체하지 않는 대신, 두 소스가 갈라지는 것을
 * 런타임이 아니라 타입체크 시점에 잡아낸다.)
 */
type AssertEqual<A, B> = A extends B ? (B extends A ? true : false) : false;
type AssertTrue<T extends true> = T;

export type TodoSummarySchemaMatchesType = AssertTrue<
  AssertEqual<z.infer<typeof todoSummarySchema>, TodoSummaryDto>
>;
export type TodoDetailSchemaMatchesType = AssertTrue<
  AssertEqual<z.infer<typeof todoDetailSchema>, TodoDetailDto>
>;
export type CreateTodoInputSchemaMatchesType = AssertTrue<
  AssertEqual<z.infer<typeof createTodoInputSchema>, CreateTodoInput>
>;
export type UpdateTodoInputSchemaMatchesType = AssertTrue<
  AssertEqual<z.infer<typeof updateTodoInputSchema>, UpdateTodoInput>
>;
export type DeleteResultSchemaMatchesType = AssertTrue<
  AssertEqual<z.infer<typeof deleteResultSchema>, DeleteResult>
>;
export type UploadImageResultSchemaMatchesType = AssertTrue<
  AssertEqual<z.infer<typeof uploadImageResultSchema>, UploadImageResult>
>;
