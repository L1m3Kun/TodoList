'use client';

import { FormEvent, useState } from 'react';

import { Button } from '@/components/button';
import { Input } from '@/components/input';

interface AddSectionProps {
  onAddTodo: (name: string) => Promise<boolean>;
}

function AddSection({ onAddTodo }: AddSectionProps) {
  const [value, setValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  const handleChangeValue = (newValue: string) => {
    setValue(newValue);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    const ok = await onAddTodo(trimmed);
    setIsSubmitting(false);
    if (ok) setValue('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center justify-between w-full gap-4"
    >
      <Input onChange={handleChangeValue} value={value} className="w-full" />
      <Button variant="add" type="submit" disabled={!canSubmit} />
    </form>
  );
}

export { AddSection, type AddSectionProps };
