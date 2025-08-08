import * as React from "react";

type Option = { value: string; label: string };

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }) {
  return <div data-select-root>{children}</div>;
}

// For compatibility with the code's API:
export function SelectTrigger({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={["relative", className].join(" ")}>{children}</div>;
}
export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-sm">{placeholder}</span>;
}
export function SelectContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={["mt-2 p-2 rounded-xl border border-zinc-800 bg-zinc-900", className].join(" ")}>{children}</div>;
}
export function SelectItem({ value, children, onSelect }: { value: string; children: React.ReactNode; onSelect?: (v: string) => void }) {
  return <div onClick={() => onSelect?.(value)} className="px-3 py-2 rounded-lg hover:bg-zinc-800 cursor-pointer text-sm">{children}</div>;
}
