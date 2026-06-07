import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "primary" | "muted" | "white" | "gradient";
  text?: string;
  fullscreen?: boolean;
}

export function Spinner({
  size = "md",
  variant = "gradient",
  text,
  fullscreen = false,
  className,
  ...props
}: SpinnerProps) {
  // Size classes for the spinner container
  const sizeClasses = {
    xs: "h-4 w-4 stroke-[3]",
    sm: "h-6 w-6 stroke-[2.5]",
    md: "h-10 w-10 stroke-[2]",
    lg: "h-16 w-16 stroke-[2]",
    xl: "h-20 w-20 stroke-[1.5]",
    "2xl": "h-24 w-24 stroke-[1.5]",
  }[size];

  // Variant classes for the spinner stroke color
  const colorClasses = {
    primary: "text-primary",
    muted: "text-muted-foreground",
    white: "text-white",
    gradient: "text-primary",
  }[variant];

  // Text size classes matching the spinner size
  const textSizeClasses = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
    "2xl": "text-xl",
  }[size];

  const spinnerContent = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 select-none",
        className
      )}
      {...props}
    >
      <svg
        className={cn("animate-spin", sizeClasses, colorClasses)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      {text && (
        <p className={cn("text-muted-foreground font-medium", textSizeClasses)}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
}
