import React from "react";

interface VoltraLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  subtitle?: string;
}

export function VoltraLogo({
  className = "size-9",
  size = 36,
  showText = false,
  subtitle = "Grid Risk Advisor",
}: VoltraLogoProps) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className={`relative grid place-items-center rounded-xl overflow-hidden shadow-glow transition-transform hover:scale-105 ${className}`}
        style={{
          width: typeof size === "number" ? `${size}px` : size,
          height: typeof size === "number" ? `${size}px` : size,
        }}
      >
        <svg
          viewBox="0 0 512 512"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="vlBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#040914" />
              <stop offset="50%" stopColor="#081426" />
              <stop offset="100%" stopColor="#0e2344" />
            </linearGradient>
            <linearGradient id="vlRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a3e635" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="vlCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="vlBolt" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#bef264" />
              <stop offset="70%" stopColor="#a3e635" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
            <filter id="vlGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="14" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="vlCore" cx="50%" cy="55%" r="40%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#a3e635" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#040914" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Badge Background */}
          <rect
            x="24"
            y="24"
            width="464"
            height="464"
            rx="112"
            fill="url(#vlBg)"
            stroke="url(#vlRim)"
            strokeWidth="12"
          />

          {/* Core Ambient Glow */}
          <circle cx="256" cy="270" r="180" fill="url(#vlCore)" />

          {/* Subtle Grid Telemetry Reticle */}
          <g opacity="0.15" stroke="#00f0ff" strokeWidth="2">
            <line x1="80" y1="256" x2="432" y2="256" strokeDasharray="8 8" />
            <line x1="256" y1="80" x2="256" y2="432" strokeDasharray="8 8" />
            <circle cx="256" cy="256" r="140" fill="none" strokeDasharray="6 6" />
          </g>

          {/* Left Wing - Cyan Vector */}
          <path
            d="M 124 136 L 194 136 L 256 320 L 210 376 L 124 136 Z"
            fill="url(#vlCyan)"
            filter="url(#vlGlow)"
          />

          {/* Right Wing & Bolt - Electric Lime Lightning */}
          <path
            d="M 388 136 L 272 268 L 322 268 L 220 404 L 260 292 L 208 292 L 318 136 Z"
            fill="url(#vlBolt)"
            filter="url(#vlGlow)"
          />

          {/* Center Apex Spark */}
          <polygon
            points="256,220 266,248 294,256 266,264 256,292 246,264 218,256 246,248"
            fill="#ffffff"
            opacity="0.95"
          />
        </svg>
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
