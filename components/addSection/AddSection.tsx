'use client';

import { useState } from 'react';

import { Button } from '@/components/button';
import { Input } from '@/components/input';

function AddSection() {
  const [inputValue, setInputValue] = useState<string>('');
  const onChange = (newValue: string) => {
    setInputValue(newValue);
  };
  return (
    <div className="flex items-center justify-between w-full gap-4">
      <Input onChange={onChange} value={inputValue} className="w-full" />
      <Button variant="add" />
    </div>
  );
}

export { AddSection };
