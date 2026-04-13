import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

const Command = React.forwardRef(function Command(
  { className, ...props },
  ref
) {
  return (
    <CommandPrimitive
      ref={ref}
      className={cn("flex flex-col rounded-md border", className)}
      {...props}
    />
  );
});

const CommandInput = React.forwardRef(function CommandInput(
  { className, ...props },
  ref
) {
  return (
    <div className="flex items-center border-b px-3">
      <Search className="mr-2 w-4 h-4 opacity-50" />
      <CommandPrimitive.Input
        ref={ref}
        className={cn("flex w-full py-2 outline-none", className)}
        {...props}
      />
    </div>
  );
});

const CommandList = React.forwardRef(function CommandList(
  { className, ...props },
  ref
) {
  return (
    <CommandPrimitive.List
      ref={ref}
      className={cn("max-h-60 overflow-y-auto", className)}
      {...props}
    />
  );
});

const CommandItem = React.forwardRef(function CommandItem(
  { className, ...props },
  ref
) {
  return (
    <CommandPrimitive.Item
      ref={ref}
      className={cn("px-2 py-2 cursor-pointer hover:bg-gray-100", className)}
      {...props}
    />
  );
});

export {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
};