"use client"

export function AnimatedGridLines() {
  return (
    <svg className="animated-grid-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="grid-pulse-x" x1="0" x2="1">
          <stop offset="0" stopColor="var(--signal)" stopOpacity="0" />
          <stop offset=".5" stopColor="var(--signal)" stopOpacity=".7" />
          <stop offset="1" stopColor="var(--signal)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="grid-pulse-y" y1="0" y2="1">
          <stop offset="0" stopColor="var(--signal)" stopOpacity="0" />
          <stop offset=".5" stopColor="var(--signal)" stopOpacity=".55" />
          <stop offset="1" stopColor="var(--signal)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="energy-line energy-line-x" d="M0 22 H100" stroke="url(#grid-pulse-x)" />
      <path className="energy-line energy-line-y" d="M62 0 V100" stroke="url(#grid-pulse-y)" />
      <path className="energy-line energy-line-x energy-line-delay" d="M0 74 H100" stroke="url(#grid-pulse-x)" />
      <path className="energy-line energy-line-y energy-line-delay" d="M18 0 V100" stroke="url(#grid-pulse-y)" />
    </svg>
  )
}

export function GridPulseFallback() {
  return <div className="hero-grid" aria-hidden="true" />
}
