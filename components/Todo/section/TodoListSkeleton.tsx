const SKELETON_ROW_COUNT = 3;

/**
 * TodoSection의 isLoading=true일 때 렌더되는 목록 placeholder.
 * TodoItem의 기하(h-12.5 / rounded-[27px] / border-2 / py-4.5 px-2)를 그대로 흉내내
 * 실제 데이터가 도착했을 때 레이아웃이 튀지 않게 한다.
 * 로딩 고지는 상위 컨테이너의 aria-busy가 담당하므로 스크린리더에는 노출하지 않는다.
 */
function TodoListSkeleton() {
  return (
    <div className="w-full min-w-0" aria-hidden="true">
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <div
          key={index}
          className="w-full min-w-0 h-12.5 rounded-[27px] border-2 border-slate-900 bg-slate-100 py-4.5 px-2 animate-pulse"
        />
      ))}
    </div>
  );
}

export { TodoListSkeleton };
