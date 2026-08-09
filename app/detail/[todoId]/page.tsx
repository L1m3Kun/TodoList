'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';

import { StatusMessage } from '@/components/status';
import { useTodoDetail } from '@/hooks/useTodoDetail';
import { safeParseTodoId } from '@/lib/utils';
import type { TodoDetailDto, UpdateTodoInput } from '@/types/todo.dto';

import { TodoDetailEditor } from './TodoDetailEditor';

// D-27/D-30 — main은 명시적 폭(w-full + max-w-300)을 가져야 flex 컨테이너에서
// shrink-to-fit이 되지 않는다. 로딩/에러/정상 3개 분기가 모두 같은 컨테이너를 쓰므로
// 모듈 상수로 묶어 중복을 없앤다.
const DETAIL_MAIN_CLASSNAME = 'flex w-full max-w-300 flex-col gap-6 mx-auto px-2 tablet:px-4 my-19';
const INVALID_ID_DESCRIPTION = '주소창에 입력한 할 일 번호 형식이 올바르지 않습니다.';
// H-1 — useTodoDetail.remove()는 성공 시 detail:null, error:null로 만든다(훅 시그니처는
// 변경하지 않는다, S-3). 그 경로는 아래 isDeleted 분기가 !detail보다 먼저 가로채므로
// 여기까지 오지 않는다. 그 경로를 제외하면 로딩 종료 후 detail===null인데 error도 null인
// 다른 도달 경로를 찾지 못했다(id 변경·마운트 시에는 fetchDetail이 setState로 isLoading을
// 먼저 true로 되돌리므로 위 isLoading 분기가 가로챈다) — 그래도 error!.message 단언 대신
// 안전한 fallback으로 남겨 둔다.
const UNEXPECTED_ERROR_TITLE = '알 수 없는 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
const NAVIGATING_AFTER_DELETE_TITLE = '목록으로 이동 중입니다.';

// PageProps<'/detail/[todoId]'>는 .next/types/routes.d.ts가 만드는 전역 타입이다(D-73 실측).
// useParams() 대신 이걸 쓰면 라우트 리터럴과 타입이 묶여 경로가 바뀌면 tsc가 잡는다.
export default function DetailPage({ params }: PageProps<'/detail/[todoId]'>) {
  const { todoId } = use(params);
  const id = safeParseTodoId(todoId);

  if (id === null) {
    return (
      <main className={DETAIL_MAIN_CLASSNAME}>
        <StatusMessage
          tone="error"
          title="잘못된 주소입니다."
          description={INVALID_ID_DESCRIPTION}
        />
      </main>
    );
  }

  return <TodoDetailView id={id} />;
}

/** 유효한 id일 때만 마운트된다 — id===null 분기에서 훅을 조건부로 호출하지 않기 위한 경계(AD-6). */
function TodoDetailView({ id }: { id: number }) {
  const { detail, isLoading, error, update, remove } = useTodoDetail(id);
  const router = useRouter();
  // H-1 — remove() 성공 시 훅이 detail을 비우므로(detail:null, error:null), 그 렌더가
  // 커밋되면 아래 !detail 분기가 "알 수 없는 문제가 발생했습니다"를 role="alert"로 띄운다.
  // router.push('/')는 그 다음 문장이라 네비게이션이 완료되기 전까지 그 프레임이 보인다.
  // 훅 시그니처는 바꾸지 않고(S-3) 소비자 쪽에서 그 프레임을 "이동 중" 상태로 대체한다.
  const [isDeleted, setIsDeleted] = useState(false);

  // 저장 성공 시 목록으로 복귀한다(D-81). 실패 시 이동하지 않고 update()가 채운
  // error state가 아래 배너로 드러난다 — 에디터는 라우팅을 모른 채 patch만 넘긴다.
  async function handleSave(patch: UpdateTodoInput): Promise<TodoDetailDto | null> {
    const saved = await update(patch);
    if (saved) router.push('/');
    return saved;
  }

  // 삭제 성공 시에만 이동한다. D-53 — 없는 항목 DELETE는 500이라, 500을 "이미 삭제됨"으로
  // 임의 해석해 이동시키지 않는다.
  async function handleDelete(): Promise<void> {
    const ok = (await remove()) !== null;
    if (!ok) return;
    setIsDeleted(true);
    router.push('/');
  }

  if (isLoading) {
    return (
      <main className={DETAIL_MAIN_CLASSNAME}>
        <StatusMessage tone="loading" title="불러오는 중입니다." />
      </main>
    );
  }

  if (isDeleted) {
    return (
      <main className={DETAIL_MAIN_CLASSNAME}>
        <StatusMessage tone="loading" title={NAVIGATING_AFTER_DELETE_TITLE} />
      </main>
    );
  }

  if (!detail) {
    // 404면 error.message가 이미 '요청한 항목을 찾을 수 없습니다.'다(status로 분기하지 않는다).
    // S-4 — error.message만 쓴다. serverMessage/details는 절대 렌더하지 않는다.
    return (
      <main className={DETAIL_MAIN_CLASSNAME}>
        <StatusMessage tone="error" title={error?.message ?? UNEXPECTED_ERROR_TITLE} />
      </main>
    );
  }

  return (
    <main className={DETAIL_MAIN_CLASSNAME}>
      {error ? <StatusMessage tone="error" title={error.message} /> : null}
      <TodoDetailEditor
        key={detail.id}
        detail={detail}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </main>
  );
}
