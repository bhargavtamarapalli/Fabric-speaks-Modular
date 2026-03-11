"use client";

import React, { useRef, useState, KeyboardEvent, ClipboardEvent } from "react";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
  autoFocus = true,
}: OTPInputProps) {
  const [activeSegment, setActiveSegment] = useState(0);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  const handleUpdate = (newVal: string) => {
    onChange(newVal);
    if (newVal.length === length && onComplete) {
      onComplete(newVal);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const currentArr = value.split("");
      
      if (currentArr[index]) {
        currentArr[index] = "";
        handleUpdate(currentArr.join(""));
      } else if (index > 0) {
        currentArr[index - 1] = "";
        handleUpdate(currentArr.join(""));
        setActiveSegment(index - 1);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (index > 0) {
        setActiveSegment(index - 1);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (index < length - 1) {
        setActiveSegment(index + 1);
        inputRefs.current[index + 1]?.focus();
      }
    } else if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const currentArr = value.padEnd(length, " ").split("");
      currentArr[index] = e.key;
      const newVal = currentArr.join("").trim();
      handleUpdate(newVal);
      
      if (index < length - 1) {
        setActiveSegment(index + 1);
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleFocus = (index: number) => {
    setActiveSegment(index);
    inputRefs.current[index]?.select();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").slice(0, length).replace(/[^0-9]/g, "");
    if (pastedData) {
      handleUpdate(pastedData);
      const nextIndex = Math.min(pastedData.length, length - 1);
      setActiveSegment(nextIndex);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      className="flex gap-2"
      role="group"
      aria-label="OTP input"
    >
      {Array.from({ length }).map((_, index) => {
        const char = value[index] || "";
        const isActive = activeSegment === index;
        return (
          <input
            key={index}
            ref={(el) => {
              if (el) inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={char}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            aria-label={`OTP digit ${index + 1} of ${length}`}
            className={`w-[48px] h-[56px] text-center text-lg font-medium border rounded-[var(--radius-md)] focus:outline-none transition-all duration-200
              ${error ? "bg-[var(--fs-error-lt)] border-[var(--fs-error)] animate-shake" : ""}
              ${disabled ? "bg-[var(--fs-surface-1)] text-[var(--fs-text-disabled)] cursor-not-allowed border-[var(--fs-surface-2)]" : ""}
              ${!error && !disabled ? (isActive ? "border-[var(--fs-teal-dk)] shadow-sm bg-[var(--fs-surface-0)] text-[var(--fs-text-primary)]" : "border-[var(--fs-text-disabled)] bg-[var(--fs-surface-0)] text-[var(--fs-text-primary)]") : ""}
            `}
            onChange={() => {}} // Controlled by onKeyDown
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={() => handleFocus(index)}
            onPaste={handlePaste}
            onPointerDown={(e) => {
              if (disabled) e.preventDefault();
            }}
          />
        );
      })}
    </div>
  );
}
