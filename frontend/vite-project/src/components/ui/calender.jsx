import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        caption: "flex justify-center items-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 p-0 opacity-70 hover:opacity-100"
        ),
        table: "w-full",
        head_row: "flex",
        head_cell: "w-9 text-xs text-muted-foreground",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0"),
        day_selected: "bg-primary text-white",
        day_today: "bg-gray-200",
        day_outside: "opacity-50",
        day_disabled: "opacity-50",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="w-4 h-4" />,
        IconRight: () => <ChevronRight className="w-4 h-4" />,
      }}
      {...props}
    />
  );
}

export { Calendar };