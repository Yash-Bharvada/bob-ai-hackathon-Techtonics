export type Theme = "light" | "dark"

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light"
  const stored = window.localStorage.getItem("voltra-theme")
  if (stored === "light" || stored === "dark") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function applyTheme(theme: Theme, origin?: HTMLElement) {
  const root = document.documentElement
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const commit = () => {
    root.classList.toggle("dark", theme === "dark")
    root.classList.toggle("light", theme === "light")
    window.localStorage.setItem("voltra-theme", theme)
  }
  if (document.startViewTransition && !reduced && origin) {
    const transition = document.startViewTransition(commit)
    transition.ready.then(() => {
      const rect = origin.getBoundingClientRect()
      const radius = Math.hypot(Math.max(rect.left, innerWidth - rect.left), Math.max(rect.top, innerHeight - rect.top))
      root.animate({ clipPath: [`circle(0px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px)`, `circle(${radius}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px)`] }, { duration: 620, easing: "cubic-bezier(0.16,1,0.3,1)", pseudoElement: "::view-transition-new(root)" })
    })
    return
  }
  root.classList.add("theme-transition"); commit(); window.setTimeout(() => root.classList.remove("theme-transition"), reduced ? 0 : 460)
}

export const themeInitScript = `(() => { try { const stored = localStorage.getItem('voltra-theme'); const dark = stored === 'dark' || (stored !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', dark); document.documentElement.classList.toggle('light', !dark); } catch {} })()`
