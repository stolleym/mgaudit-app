import * as React from "react";

export function Badge({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["inline-flex items-center rounded-full px-2 py-0.5 text-xs border border-transparent", className].join(" ")} {...props} />;
}
