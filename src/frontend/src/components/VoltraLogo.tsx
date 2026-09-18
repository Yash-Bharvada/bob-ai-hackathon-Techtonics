import React from "react";

interface VoltraLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  subtitle?: string;
  variant?: "auto" | "dark" | "light" | "lime" | "badge-dark" | "badge-light";
}

export function VoltraLogo({
  className = "size-9",
  size = 36,
  showText = false,
  subtitle = "Grid Risk Advisor",
  variant = "auto",
}: VoltraLogoProps) {
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className={`relative grid place-items-center rounded-xl overflow-hidden shadow-glow transition-transform hover:scale-105 ${className}`}
        style={{
          width: dimension,
          height: dimension,
        }}
      >
        {variant === "dark" || variant === "badge-dark" ? (
          <img
            src="/assets/voltra-logo-dark.png"
            alt="VOLTRA"
            className="size-full object-contain"
          />
        ) : variant === "light" || variant === "badge-light" ? (
          <img
            src="/assets/voltra-logo-light.png"
            alt="VOLTRA"
            className="size-full object-contain"
          />
        ) : variant === "lime" ? (
          <img
            src="/assets/voltra-logo-lime.png"
            alt="VOLTRA"
            className="size-full object-contain"
          />
        ) : (
          <>
            {/* Auto: adapts to dark/light theme */}
            <img
              src="/assets/voltra-logo-dark.png"
              alt="VOLTRA"
              className="size-full object-contain hidden dark:block"
            />
            <img
              src="/assets/voltra-logo-light.png"
              alt="VOLTRA"
              className="size-full object-contain block dark:hidden"
            />
          </>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="text-base font-bold leading-none tracking-tight text-foreground font-mono">
            VOLTRA
          </span>
          {subtitle && (
            <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}

