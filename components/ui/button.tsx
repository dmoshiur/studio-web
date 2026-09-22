import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — gold gradient on navy ink. Corporate rounded-xl proportions.
 * `gold` is the primary action, `outlineLight` sits on dark surfaces,
 * `ghostDark` is for the studio surfaces.
 */
const buttonVariants = cva(
  "group/btn relative inline-flex items-center justify-center gap-2.5 overflow-hidden whitespace-nowrap rounded-xl font-sans text-[12.5px] font-bold uppercase tracking-[0.14em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] [&_svg]:size-[15px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        gold: "bg-gold-gradient text-obsidian-950 shadow-gold-sm hover:shadow-gold hover:brightness-105",
        obsidian: "bg-obsidian-700 text-white hover:bg-obsidian-600 shadow-brand-sm",
        outline:
          "border border-gold-500/50 text-gold-200 hover:border-gold-400 hover:bg-gold-500/[0.08]",
        outlineLight:
          "border border-white/25 bg-white/[0.04] text-ivory-100 backdrop-blur-sm hover:border-gold-400/60 hover:bg-white/[0.08]",
        ivory: "bg-ivory-100 text-obsidian-900 hover:bg-white",
        /* Light-theme actions */
        ink: "bg-obsidian-700 text-white shadow-brand-sm hover:bg-obsidian-600 hover:shadow-brand",
        outlineInk:
          "border border-line bg-white text-ink-900 shadow-card hover:border-obsidian-700 hover:text-obsidian-700",
        ghost: "text-ivory-300 hover:bg-white/[0.06] hover:text-ivory-100",
        ghostDark: "text-ink-500 hover:bg-ink-900/[0.05] hover:text-ink-900",
        danger: "bg-crimson-500 text-white hover:bg-crimson-400",
        dangerOutline: "border border-danger/40 text-danger hover:bg-danger/[0.07]",
        link: "text-gold-300 underline-offset-4 hover:text-gold-200 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-[11.5px] tracking-[0.16em]",
        md: "h-11 px-6",
        lg: "h-[52px] px-8 text-[13px]",
        icon: "h-10 w-10 px-0",
        iconSm: "h-8 w-8 px-0",
      },
    },
    defaultVariants: { variant: "gold", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && (
        <svg className="animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

/** Anchor styled exactly like a Button — for links that must not nest in a button. */
export interface ButtonLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof buttonVariants> {}

export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant, size, children, ...props }, ref) => (
    <a ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </a>
  )
);
ButtonLink.displayName = "ButtonLink";

export { buttonVariants };
