'use client';

import { useState } from 'react';

import { Button } from '@/components/button';
import { StatusMessage } from '@/components/status';
import { TodoImageBox, TodoItemDetail, TodoMemoBox } from '@/components/Todo/detail';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toTodoDetail, toUpdateTodoInput } from '@/lib/adapters';
import type { TodoDetail } from '@/types/todo';
import type { TodoDetailDto, UpdateTodoInput } from '@/types/todo.dto';

interface TodoDetailEditorProps {
  detail: TodoDetailDto;
  onSave: (patch: UpdateTodoInput) => Promise<TodoDetailDto | null>;
  onDelete: () => Promise<void>;
}

/**
 * 드래프트 일괄 저장 편집기(AD-5/D-72). 제목·메모·완료여부는 로컬 드래프트에만
 * 반영하고 "수정 완료"에서 한 번의 PATCH로 저장한다. 이미지는 선택 즉시 업로드한다.
 *
 * 라우팅(저장/삭제 성공 시 목록으로 이동)은 이 컴포넌트가 모른다 — 페이지(page.tsx)가
 * onSave/onDelete를 감싸 결정한다. 이 컴포넌트는 draft 상태와 저장/업로드 pending만
 * 책임진다(결과 파일에 이유 기록).
 */
function TodoDetailEditor({ detail, onSave, onDelete }: TodoDetailEditorProps) {
  // 마운트 시 1회 초기화(AD-7/S-5) — effect 동기화도 렌더 중 setState도 lint error다.
  // 페이지가 key={detail.id}를 주므로 id가 바뀌면 이 컴포넌트가 재마운트된다.
  const [draft, setDraft] = useState<TodoDetail>(() => toTodoDetail(detail));
  const [isSaving, setIsSaving] = useState(false);
  const { isUploading, error: uploadError, upload } = useImageUpload();

  // 렌더 중 파생(S-5) — effect 없이 매 렌더 계산한다. 저장 성공으로 detail이 서버
  // 응답으로 바뀌면 base가 따라 바뀌어 isDirty가 자연히 false가 된다.
  const base = toTodoDetail(detail);
  const patch = toUpdateTodoInput(draft, base);
  const isDirty = Object.keys(patch).length > 0;

  function handleToggleFinish() {
    setDraft((curr) => ({ ...curr, isFinish: !curr.isFinish }));
  }

  function handleChangeMemo(value: string) {
    setDraft((curr) => ({ ...curr, memo: value }));
  }

  async function handleSelectImage(file: File) {
    const url = await upload(file);
    // 실패 시 uploadError가 채워지므로 여기서 별도 처리는 필요 없다.
    if (url) setDraft((curr) => ({ ...curr, imageUrl: url }));
  }

  async function handleSave() {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    await onSave(patch);
    setIsSaving(false);
  }

  // 삭제는 로컬 상태로 되돌릴 필요가 없어(성공 시 페이지가 이동, 실패 시 배너는
  // 페이지가 error state로 띄운다) fire-and-forget으로 둔다(S-8).
  function handleDeleteClick() {
    void onDelete();
  }

  return (
    <>
      <TodoItemDetail
        todo={draft.todo}
        isFinish={draft.isFinish}
        finishTodo={handleToggleFinish}
      />
      <div className="flex flex-col items-stretch gap-4 lg:flex-row">
        <TodoImageBox
          imageUrl={draft.imageUrl}
          onSelectImage={handleSelectImage}
          isUploading={isUploading}
          className="lg:w-2/5"
        />
        <TodoMemoBox
          memo={draft.memo}
          onChangeMemo={handleChangeMemo}
          className="lg:flex-1 lg:aspect-auto"
        />
      </div>
      {uploadError ? <StatusMessage tone="error" title={uploadError.message} /> : null}
      <div className="flex items-center justify-center gap-4 lg:justify-end">
        <Button variant="edit" onClick={handleSave} disabled={!isDirty || isSaving} />
        <Button variant="delete" onClick={handleDeleteClick} />
      </div>
    </>
  );
}

export { TodoDetailEditor, type TodoDetailEditorProps };
