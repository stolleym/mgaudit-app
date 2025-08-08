import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary";
  size?: "sm" | "md";
  className?: string;
};

export function Button({ variant="default", size="md", className="", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium transition rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "bg-zinc-100 text-zinc-900 hover:bg-white/90",
    secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700",
  } as const;
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
  } as const;
  return <button className={[base, variants[variant], sizes[size], className].join(" ")} {...props} />;
}
