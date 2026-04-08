import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "../../lib/utils";

const Progress = React.forwardRef(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn("h-full flex-1 transition-all duration-500 rounded-full", indicatorClassName || "bg-primary")}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-sm font-medium leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Progress, Label };
