import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardProps extends React.HTMLAttributes<HTMLDivElement> {
  logoSrc?: string;
  logoAlt?: string;
  title: string;
  description?: string;
  footerContent?: React.ReactNode;
  children: React.ReactNode;
}

export function AuthCard({
  className,
  logoSrc,
  logoAlt = "Lapor.ah",
  title,
  description,
  footerContent,
  children,
  ...props
}: AuthCardProps) {
  return (
    <Card
      className={cn(
        "w-full max-w-md border-foreground/10 shadow-xl bg-background/95 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <CardHeader className="space-y-3 text-center pb-2">
        {logoSrc ? (
          <div className="mx-auto flex h-14 w-14 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt={logoAlt} className="h-12 w-12 object-contain" />
          </div>
        ) : (
          <div className="mx-auto font-display text-3xl tracking-tight">
            Lapor<span className="text-muted-foreground">.ah</span>
          </div>
        )}
        <CardTitle className="text-2xl font-display">{title}</CardTitle>
        {description && (
          <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footerContent && (
        <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground border-t pt-6">
          {footerContent}
        </CardFooter>
      )}
    </Card>
  );
}
