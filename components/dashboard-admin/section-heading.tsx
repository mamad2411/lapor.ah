import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  label?: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeading({ label, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-6 lg:mb-8", className)}>
      {label && (
        <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-3">
          <span className="w-8 h-px bg-foreground/30" />
          {label}
        </span>
      )}
      <h2 className="font-display text-2xl lg:text-3xl tracking-tight">{title}</h2>
      {description && (
        <p className="mt-2 text-muted-foreground leading-relaxed max-w-2xl">{description}</p>
      )}
    </div>
  );
}
