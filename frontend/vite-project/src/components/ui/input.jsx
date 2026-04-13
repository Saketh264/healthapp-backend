import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(function Input(
  { className, type, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-md border px-3 py-2 text-sm outline-none",
        className
      )}
      {...props}
    />
  );
});

export { Input };