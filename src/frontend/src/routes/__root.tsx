import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode, useState, useEffect } from "react";

import appCss from "../styles.css?url";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Toaster } from "@/components/ui/sonner";
import { CinematicLanding } from "@/cinematic/CinematicLanding.tsx";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground font-mono">404</h1>
        <p className="mt-4 text-muted-foreground">This grid segment is offline.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="pill inline-flex items-center bg-ink px-5 py-2.5 text-sm text-cream hover:bg-ink/90"
          >
            Dashboard Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error("Signal error caught in root boundary:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">
          The telemetry signal was interrupted
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Attempting automated reconnect to local grid telemetry gateway.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="pill bg-ink px-5 py-2.5 text-sm text-cream hover:bg-ink/90"
          >
            Reconnect Telemetry
          </button>
          <a
            href="/"
            className="pill border border-border px-5 py-2.5 text-sm text-foreground hover:bg-surface"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VOLTRA — Predictive Grid Intelligence" },
      {
        name: "description",
        content:
          "VOLTRA analyzes real-time grid behavior, dissolved gases, and physical telemetry to forecast outages before equipment failure occurs.",
      },
      { name: "author", content: "VOLTRA Intelligence Systems" },
      { property: "og:title", content: "VOLTRA — Predictive Grid Intelligence" },
      {
        property: "og:description",
        content: "The lights have not gone out yet. VOLTRA sees that they are going to.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
      },
      // Preload the first cinematic frame for instant display
      {
        rel: "preload",
        as: "image",
        href: "/assets/cinematic/first-frame.webp",
        type: "image/webp",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Start as false — the cinematic layer mounts itself via useEffect (client only).
  // Server renders the dashboard fully visible, client immediately overlays cinematic.
  const [showCinematic, setShowCinematic] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setShowCinematic(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Cinematic landing — only mounted on client after hydration */}
      {mounted && showCinematic && <CinematicLanding onEnter={() => setShowCinematic(false)} />}

      {/* React dashboard — always rendered for SSR; hidden by cinematic overlay on client */}
      <div
        className="min-h-screen flex flex-col bg-background text-foreground"
        style={
          mounted && showCinematic
            ? {
                opacity: 0,
                pointerEvents: "none",
                transition: "opacity 0.65s cubic-bezier(0.4,0,0.2,1)",
              }
            : { opacity: 1, transition: "opacity 0.65s cubic-bezier(0.4,0,0.2,1)" }
        }
      >
        <SiteNav />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>

      <Toaster />
    </QueryClientProvider>
  );
}
