/**
 * Input, Textarea, NativeSelect — the one look for typing and choosing (P7). Plain browser elements underneath, so
 * forms, keyboard and screen readers behave as before; only the look is shared. Sliders, ticks and colour wells stay
 * plain inputs: they are not boxes.
 */
// REUSE-CHECKED: input|select|textarea|NumberField in components/ui and features/ui -> only button/segmented/tab-bar exist;
// NumberField is commit logic, not a look, and now renders this Input.
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const fieldVariants = cva(
  "tw:font-[inherit] tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-input tw:bg-background tw:text-foreground tw:transition-[color,border-color,box-shadow] tw:outline-none tw:placeholder:text-muted-foreground tw:hover:border-ring/60 tw:focus-visible:border-ring tw:focus-visible:ring-3 tw:focus-visible:ring-ring/40 tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:aria-invalid:border-destructive tw:aria-invalid:ring-3 tw:aria-invalid:ring-destructive/20 tw:dark:bg-input/30",
  {
    variants: {
      size: {
        default: "tw:h-8 tw:px-2.5 tw:text-sm",
        sm: "tw:h-7 tw:px-2 tw:text-[0.8rem]",
        xs: "tw:h-6 tw:px-1.5 tw:text-xs",
      },
    },
    defaultVariants: { size: "sm" },
  }
)

type FieldSize = VariantProps<typeof fieldVariants>["size"]

function Input({ className, size, type = "text", ...props }: Omit<React.ComponentProps<"input">, "size"> & { size?: FieldSize }) {
  return <input type={type} data-slot="input" className={cn(fieldVariants({ size }), type === "number" && "tw:font-mono", className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldVariants({ size: "sm" }), "tw:h-auto tw:min-h-16 tw:py-1.5 tw:resize-y", className)} {...props} />
}

/** The browser's own list (works everywhere, keyboard included) in the shared box, with a drawn arrow. */
function NativeSelect({ className, size, ...props }: Omit<React.ComponentProps<"select">, "size"> & { size?: FieldSize }) {
  return (
    <select
      data-slot="select"
      className={cn(
        fieldVariants({ size }),
        "tw:cursor-pointer tw:appearance-none tw:pr-7 tw:bg-no-repeat tw:bg-[length:10px_6px] tw:bg-[position:right_9px_center]",
        "tw:bg-[image:var(--select-arrow)]",
        className
      )}
      {...props}
    />
  )
}

export { Input, Textarea, NativeSelect, fieldVariants }
