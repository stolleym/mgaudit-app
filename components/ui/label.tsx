import * as React from "react";

export function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={["block text-xs font-medium mb-1", className].join(" ")} {...props} />;
}
