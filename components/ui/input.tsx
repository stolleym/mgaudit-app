import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { className?: string; };
export function Input({ className = "", ...props }: Props) {
  const base = "w-full h-10 px-3 rounded-xl border bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/40";
  return <input className={[base, className].join(" ")} {...props} />;
}
