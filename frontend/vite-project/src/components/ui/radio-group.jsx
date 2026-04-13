import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef(function RadioGroup(
  { className, ...props },
  ref
) {
  return (
    <RadioGroupPrimitive.Root
      ref={ref}
      className={cn("flex gap-2", className)}
      {...props}
    />
  );
});

const RadioGroupItem = React.forwardRef(function RadioGroupItem(
  { className, ...props },
  ref
) {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "h-4 w-4 rounded-full border border-gray-400 flex items-center justify-center",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator>
        <Circle className="w-2 h-2 fill-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});

export { RadioGroup, RadioGroupItem };