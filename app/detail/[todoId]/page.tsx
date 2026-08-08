'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { TodoImageBox, TodoItemDetail, TodoMemoBox } from '@/components/Todo/detail';
import type { TodoDetail } from '@/types';

// 로컬 state 스코프(D-29, D-16 철회) — todoId 기반 실제 조회가 없는 초기(default) 값.
// 다음 브랜치(서버 연동)에서 todoId로 조회한 실제 값 + fetch 로직으로 대체된다.
const initialTodoDetail: TodoDetail = {
  id: 1,
  todo: '비타민 챙겨먹기',
  imageUrl: '',
  memo: '',
  isFinish: false,
};

export default function DetailPage() {
  const [todoDetail, setTodoDetail] = useState<TodoDetail>(initialTodoDetail);

  // 첨부 이미지가 로컬 blob URL일 때만 리소스 누수를 막기 위해 정리한다.
  // imageUrl이 바뀔 때(이전 값 정리)와 언마운트 시 모두 실행된다.
  useEffect(() => {
    return () => {
      if (todoDetail.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(todoDetail.imageUrl);
      }
    };
  }, [todoDetail.imageUrl]);

  function handleFinishTodo() {
    setTodoDetail((curr) => ({ ...curr, isFinish: !curr.isFinish }));
  }

  function handleChangeMemo(value: string) {
    setTodoDetail((curr) => ({ ...curr, memo: value }));
  }

  function handleSelectImage(file: File) {
    const nextImageUrl = URL.createObjectURL(file);
    setTodoDetail((curr) => ({ ...curr, imageUrl: nextImageUrl }));
  }

  return (
    <main className="flex w-full max-w-300 flex-col gap-6 mx-auto px-2 tablet:px-4 my-19">
      <TodoItemDetail
        todo={todoDetail.todo}
        isFinish={todoDetail.isFinish}
        finishTodo={handleFinishTodo}
      />
      <div className="flex flex-col items-stretch gap-4 lg:flex-row">
        <TodoImageBox
          imageUrl={todoDetail.imageUrl}
          onSelectImage={handleSelectImage}
          className="lg:w-2/5"
        />
        <TodoMemoBox
          memo={todoDetail.memo}
          onChangeMemo={handleChangeMemo}
          className="lg:flex-1 lg:aspect-auto"
        />
      </div>
      <div className="flex items-center justify-center gap-4 lg:justify-end">
        <Button variant="edit" />
        <Button variant="delete" />
      </div>
    </main>
  );
}
