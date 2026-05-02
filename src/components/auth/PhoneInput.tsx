'use client';

import { ChangeEvent } from 'react';
import { formatPhoneNumber } from '@/lib/auth';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = '010-0000-0000',
  disabled,
}: PhoneInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  return (
    <input
      type="tel"
      inputMode="tel"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={13}
      disabled={disabled}
      className="input-cute text-center font-sans font-semibold text-lg tracking-wide tabular-nums"
      autoComplete="tel"
    />
  );
}
