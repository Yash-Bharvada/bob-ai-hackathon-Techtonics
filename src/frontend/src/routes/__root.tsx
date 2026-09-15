import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";

import appCss from "../styles.css?url";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Toaster } from "@/components/ui/sonner";
import { CinematicLanding } from "@/cinematic/CinematicLanding.tsx";
import { authSession } from "@/lib/authSession";

// Protected routes that redirect to /login when unauthenticated
const PROTECTED_ROUTES = ["/dashboard", "/grid", "/predict", "/technology"];

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground font-mono">404</h1>
        <p className="mt-4 text-muted-foreground">This grid segment is offline.</p>
        <div className="mt-6">
          <Link to="/" className="pill inline-flex items-center bg-ink px-5 py-2.5 text-sm text-cream hover:bg-ink/90">
            Return to Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Signal error caught in root boundary:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">The telemetry signal was interrupted</h1>
        <p className="mt-2 text-sm text-muted-foreground">Attempting automated reconnect to local grid telemetry gateway.</p>
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
          <a href="/" className="pill border border-border px-5 py-2.5 text-sm text-foreground hover:bg-surface">
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
      { name: "description", content: "VOLTRA analyzes real-time grid behavior, dissolved gases, and physical telemetry to forecast outages before equipment failure occurs." },
      { name: "author", content: "VOLTRA Intelligence Systems" },
      { property: "og:title", content: "VOLTRA — Predictive Grid Intelligence" },
      { property: "og:description", content: "The lights have not gone out yet. VOLTRA sees that they are going to." },
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
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@700;800;900&display=swap" },
      { rel: "preload", as: "image", href: "/assets/cinematic/first-frame.webp", type: "image/webp" },
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
  const { location } = useRouterState();
  const navigate = useNavigate();
  const path = location.pathname;
  const isHome = path === "/";
  const isLogin = path === "/login";

  // Client-side auth guard — redirect unauthenticated users away from protected routes
  useEffect(() => {
    const isProtected = PROTECTED_ROUTES.some((p) => path.startsWith(p));
    if (isProtected && !authSession.isAuthenticated()) {
      navigate({ to: "/login", replace: true });
    }
  }, [path, navigate]);

  // Login page: no SiteNav, SiteFooter, or cinematic wrapper
  if (isLogin) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CinematicLanding isHomePage={isHome}>
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <SiteNav />
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter />
        </div>
      </CinematicLanding>
      <Toaster />
    </QueryClientProvider>
  );
}
