'use client';

import { ChangeEvent, useId, useRef } from 'react';
import Image from 'next/image';

import ImageIcon from '@assets/icon/image/img.svg';
import { IconButton } from '@/components/button';
import { cn } from '@/lib/utils';

interface TodoImageBoxProps {
  imageUrl?: string;
  onSelectImage?: (file: File) => void;
  className?: string;
}

function TodoImageBox({ imageUrl, onSelectImage, className }: TodoImageBoxProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // accept="image/*"는 다이얼로그 필터일 뿐 보장이 아니므로, 비이미지 파일은
    // 조용히 무시한다(onSelectImage 미호출). 이번 스코프에서 토스트/알림 UI는 추가하지 않는다.
    if (file?.type.startsWith('image/')) {
      onSelectImage?.(file);
    }
    // 같은 파일을 다시 선택해도 onChange가 발생하도록 초기화
    e.target.value = '';
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl w-full aspect-[10/9] tablet:aspect-[11/5] lg:aspect-[6/5]',
        imageUrl
          ? ''
          : 'flex items-center justify-center border-2 border-dashed border-slate-300 bg-slate-50',
        className
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="할 일 첨부 이미지"
          fill
          unoptimized
          className="object-cover rounded-3xl"
        />
      ) : (
        <ImageIcon width="64" height="64" aria-hidden="true" />
      )}

      <label htmlFor={fileInputId} className="sr-only">
        할 일 첨부 이미지 파일 선택
      </label>
      <input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileInputChange}
      />

      <div className="absolute z-10 bottom-4 right-4">
        {imageUrl ? (
          <IconButton variant="edit" onClick={handleTriggerFilePicker} />
        ) : (
          <IconButton variant="add" onClick={handleTriggerFilePicker} />
        )}
      </div>
    </div>
  );
}

export { TodoImageBox, type TodoImageBoxProps };
