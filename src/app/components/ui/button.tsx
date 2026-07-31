import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-[#ff2d55]/45 bg-[#050709]/55 text-white shadow-[0_0_28px_rgba(255,45,85,0.10)] hover:border-[#56d6ff]/50 hover:bg-[#56d6ff]/10 hover:text-white",
        destructive:
          "border border-[#ff2d55]/55 bg-[#ff2d55]/10 text-white hover:border-[#ff2d55]/80 hover:bg-[#ff2d55]/16 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-white/15 bg-[#050709]/40 text-white hover:border-[#56d6ff]/45 hover:bg-[#56d6ff]/8 hover:text-white dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "border border-white/12 bg-[#071013]/80 text-white hover:border-[#56d6ff]/35 hover:bg-[#56d6ff]/8",
        ghost:
          "text-white hover:bg-[#56d6ff]/8 hover:text-white dark:hover:bg-accent/50",
        link: "text-[#56d6ff] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
