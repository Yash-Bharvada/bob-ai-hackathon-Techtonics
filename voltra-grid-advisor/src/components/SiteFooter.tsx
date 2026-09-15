import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-ink text-lime">
              <Zap className="size-4 fill-current" />
            </span>
            <span className="font-semibold">VOLTRA</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Predictive power-grid intelligence that sees outage risk before customers lose power.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Platform</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/market" className="hover:underline">Live Grid</Link></li>
            <li><Link to="/scan" className="hover:underline">Prediction</Link></li>
            <li><Link to="/about" className="hover:underline">Technology</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Contact</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>grid@voltra.energy</li>
            <li>Built for grid operators</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} VOLTRA Systems</span>
          <span>Predict before failure.</span>
        </div>
      </div>
    </footer>
  );
}
