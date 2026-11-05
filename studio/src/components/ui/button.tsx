import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "tw:group/button tw:font-[inherit] tw:cursor-pointer tw:inline-flex tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-transparent tw:bg-clip-padding tw:text-sm tw:font-medium tw:whitespace-nowrap tw:transition-all tw:outline-none tw:select-none tw:focus-visible:border-ring tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:active:not-aria-[haspopup]:translate-y-px tw:active:shadow-none tw:disabled:pointer-events-none tw:disabled:opacity-40 tw:disabled:saturate-0 tw:disabled:shadow-none tw:aria-invalid:border-destructive tw:aria-invalid:ring-3 tw:aria-invalid:ring-destructive/20 tw:dark:aria-invalid:border-destructive/50 tw:dark:aria-invalid:ring-destructive/40 tw:[&_svg]:pointer-events-none tw:[&_svg]:shrink-0 tw:[&_svg:not([class*=size-])]:size-4",
  {
    variants: {
      variant: {
        default: "tw:bg-primary tw:text-primary-foreground tw:shadow-sm tw:hover:bg-[color-mix(in_oklch,var(--primary),white_16%)] tw:active:bg-[color-mix(in_oklch,var(--primary),black_18%)]",
        // Raised face + visible edge. Hover: lighter, blue edge. Pressed: sinks in, blue tint.
        // aria-pressed = an ON toggle (e.g. the torque switch): solid blue, so the current state is obvious.
        outline:
          "tw:text-foreground tw:border-btn-border tw:bg-btn tw:shadow-sm tw:hover:bg-btn-hover tw:hover:border-ring tw:active:bg-btn-active tw:aria-expanded:bg-btn-hover tw:aria-pressed:bg-primary tw:aria-pressed:border-primary tw:aria-pressed:text-primary-foreground tw:aria-pressed:shadow-none",
        secondary:
          "tw:bg-secondary tw:text-secondary-foreground tw:hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_10%)] tw:active:bg-btn-active tw:aria-expanded:bg-secondary tw:aria-expanded:text-secondary-foreground",
        ghost:
          "tw:text-foreground tw:bg-transparent tw:hover:bg-btn-hover tw:hover:text-foreground tw:active:bg-btn-active tw:aria-expanded:bg-muted tw:aria-expanded:text-foreground",
        destructive:
          "tw:bg-destructive/10 tw:text-destructive tw:border-destructive/45 tw:hover:bg-destructive/25 tw:hover:border-destructive tw:active:bg-destructive/40 tw:focus-visible:border-destructive/40 tw:focus-visible:ring-destructive/20 tw:dark:bg-destructive/20 tw:dark:hover:bg-destructive/35 tw:dark:active:bg-destructive/50 tw:dark:focus-visible:ring-destructive/40",
        link: "tw:bg-transparent tw:text-primary tw:underline-offset-4 tw:hover:underline",
      },
      size: {
        default:
          "tw:h-8 tw:gap-1.5 tw:px-2.5 tw:has-data-[icon=inline-end]:pr-2 tw:has-data-[icon=inline-start]:pl-2",
        xs: "tw:h-6 tw:gap-1 tw:rounded-[min(var(--radius-md),10px)] tw:px-2 tw:text-xs tw:in-data-[slot=button-group]:rounded-lg tw:has-data-[icon=inline-end]:pr-1.5 tw:has-data-[icon=inline-start]:pl-1.5 tw:[&_svg:not([class*=size-])]:size-3",
        sm: "tw:h-7 tw:gap-1 tw:rounded-[min(var(--radius-md),12px)] tw:px-2.5 tw:text-[0.8rem] tw:in-data-[slot=button-group]:rounded-lg tw:has-data-[icon=inline-end]:pr-1.5 tw:has-data-[icon=inline-start]:pl-1.5 tw:[&_svg:not([class*=size-])]:size-3.5",
        lg: "tw:h-9 tw:gap-1.5 tw:px-2.5 tw:has-data-[icon=inline-end]:pr-2 tw:has-data-[icon=inline-start]:pl-2",
        icon: "tw:size-8",
        "icon-xs":
          "tw:size-6 tw:rounded-[min(var(--radius-md),10px)] tw:in-data-[slot=button-group]:rounded-lg tw:[&_svg:not([class*=size-])]:size-3",
        "icon-sm":
          "tw:size-7 tw:rounded-[min(var(--radius-md),12px)] tw:in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "tw:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
