import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@helvety/shared/utils";

const alertVariants = cva(
  "relative flex w-full gap-2.5 rounded-none border px-3 py-2 text-sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        info: "border-border bg-muted/40 text-foreground [&>svg]:text-primary",
        success: "border-primary/30 bg-primary/5 text-foreground [&>svg]:text-primary",
        loading: "border-border bg-muted/40 text-foreground [&>svg]:text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };
