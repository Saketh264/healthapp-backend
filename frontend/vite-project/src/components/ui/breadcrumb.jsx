import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

const Breadcrumb = React.forwardRef(function Breadcrumb(
  props,
  ref
) {
  return <nav ref={ref} aria-label="breadcrumb" {...props} />;
});

const BreadcrumbList = React.forwardRef(function BreadcrumbList(
  { className, ...props },
  ref
) {
  return (
    <ol
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-2 text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  );
});

const BreadcrumbItem = React.forwardRef(function BreadcrumbItem(
  { className, ...props },
  ref
) {
  return (
    <li
      ref={ref}
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
});

const BreadcrumbLink = React.forwardRef(function BreadcrumbLink(
  { asChild, className, ...props },
  ref
) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      ref={ref}
      className={cn("hover:text-foreground transition-colors", className)}
      {...props}
    />
  );
});

const BreadcrumbPage = React.forwardRef(function BreadcrumbPage(
  { className, ...props },
  ref
) {
  return (
    <span
      ref={ref}
      aria-current="page"
      className={cn("text-foreground", className)}
      {...props}
    />
  );
});

const BreadcrumbSeparator = ({ children, className, ...props }) => (
  <li
    className={cn("flex items-center", className)}
    {...props}
  >
    {children || <ChevronRight className="w-4 h-4" />}
  </li>
);

const BreadcrumbEllipsis = ({ className, ...props }) => (
  <span
    className={cn("flex h-8 w-8 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="w-4 h-4" />
  </span>
);

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};