import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MessageCircle,
  TrendingUp,
  ShoppingBag,
  Wallet,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Package,
  Sparkles,
  Clock,
  LogOut,
  Loader2,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuthedServerFn } from "@/lib/authed-fn";
import { getDashboard } from "@/lib/server/dashboard.functions";
import { getMySubscription } from "@/lib/server/subscription.functions";
import { PLANS, type PlanId } from "@/lib/plan";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Zuma AI" },
      { name: "description", content: "Your live AI assistant overview and conversations." },
    ],
  }),
  component: Dashboard,
});

type Sub = {
  plan_id: PlanId;
  status: "trial" | "active" | "expired" | "cancelled";
  trial_ends_at: string | null;
  current_period_end: string | null;
};

const statusStyles: Record<string, string> = {
  handled: "bg-muted text-muted-foreground",
  needs_you: "bg-warning/15 text-warning-foreground border border-warning/30",
  order_placed: "bg-success/15 text-success border border-success/30",
};
const statusIcon: Record<string, typeof CheckCircle2> = {
  handled: CheckCircle2,
  needs_you: AlertCircle,
  order_placed: Package,
};
const statusLabel: Record<string, string> = {
  handled: "Handled",
  needs_you: "Needs You",
  order_placed: "Order Placed",
};

function Dashboard() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useRequireAuth();
  const callDash = useAuthedServerFn(getDashboard);
  const callSub = useAuthedServerFn(getMySubscription);

  const [name, setName] = useState("Your Business");
  const [sub, setSub] = useState<Sub | null>(null);
  const [stats, setStats] = useState({ conversationsToday: 0, ordersToday: 0, revenueToday: 0 });
  const [conversations, setConversations] = useState<
    Array<{
      id: string;
      customer_name: string | null;
      customer_number: string;
      last_message: string | null;
      last_message_at: string;
      status: string;
    }>
  >([]);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    if (!session) return;
    Promise.all([callDash(), callSub()]).then(([dash, subRes]) => {
      if (!dash.businessName) {
        navigate({ to: "/onboarding" });
        return;
      }
      setName(dash.businessName);
      setStats(dash.stats);
      setConversations(dash.conversations);
      const s = subRes.subscription as Sub | null;
      if (!s) {
        navigate({ to: "/pricing" });
        return;
      }
      const trialExpired =
        s.status === "trial" && s.trial_ends_at && new Date(s.trial_ends_at) < new Date();
      if (trialExpired || s.status === "expired") {
        navigate({ to: "/pricing" });
        return;
      }
      setSub(s);
      setHydrating(false);
    });
  }, [session, callDash, callSub, navigate]);

  const plan = sub ? PLANS[sub.plan_id] : null;
  const daysLeft =
    sub?.status === "trial" && sub.trial_ends_at
      ? Math.max(
          0,
          Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        )
      : 0;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (authLoading || hydrating) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const stat = [
    { label: "Conversations Today", value: String(stats.conversationsToday), icon: MessageCircle },
    { label: "Orders Received", value: String(stats.ordersToday), icon: ShoppingBag },
    { label: "Revenue Today", value: `₦${stats.revenueToday.toLocaleString()}`, icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-surface pb-28">
      <header className="bg-card border-b border-border/60 sticky top-0 z-10 backdrop-blur-md bg-card/90">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <h1 className="text-lg font-bold tracking-tight truncate">{name}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {plan && (
              <Link
                to="/pricing"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-smooth"
              >
                {plan.name} Plan ✓
              </Link>
            )}
            <div className="inline-flex items-center gap-2 rounded-full bg-success/15 border border-success/30 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-soft absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-xs font-semibold text-success">AI is Live</span>
            </div>
            <button
              onClick={signOut}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-smooth"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        {sub?.status === "trial" && (
          <div className="bg-warning/10 border-t border-warning/30">
            <div className="mx-auto max-w-3xl px-5 py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-warning-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">
                  Your free trial ends in {daysLeft} {daysLeft === 1 ? "day" : "days"} — upgrade to keep access
                </span>
              </div>
              <Link to="/pricing" className="font-semibold text-primary hover:underline shrink-0">
                Upgrade
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 space-y-6 animate-fade-in">
        <div className="px-1">
          <h2 className="text-xl font-bold tracking-tight">Today at {name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here's how your AI is performing right now.
          </p>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stat.map((s) => (
            <div
              key={s.label}
              className="bg-gradient-card rounded-2xl p-5 border border-border/50 shadow-sm transition-smooth hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight">{s.value}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Live data
              </div>
            </div>
          ))}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold">Recent conversations</h2>
            <span className="text-xs text-muted-foreground">Live feed</span>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
            {conversations.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No conversations yet. Connect WhatsApp in Settings to start receiving messages.
              </div>
            )}
            {conversations.map((c, i) => {
              const Icon = statusIcon[c.status] ?? CheckCircle2;
              const initials = (c.customer_name ?? c.customer_number)
                .split(/\s+/)
                .map((s) => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const timeAgo = formatTimeAgo(c.last_message_at);
              return (
                <div
                  key={c.id}
                  className={`flex items-start gap-3 p-4 transition-smooth hover:bg-muted/50 ${
                    i !== conversations.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {c.customer_name ?? c.customer_number}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
                    </div>
                    <p className="text-xs text-muted-foreground/80 truncate">{c.customer_number}</p>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {c.last_message ?? "—"}
                    </p>
                    <div
                      className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        statusStyles[c.status] ?? statusStyles.handled
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {statusLabel[c.status] ?? c.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3">
        <Link
          to="/simulator"
          className="inline-flex items-center gap-2 rounded-full bg-card text-foreground border border-border px-4 py-3 font-semibold shadow-elegant transition-spring hover:scale-105 active:scale-95"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          Test AI
        </Link>
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-5 py-3.5 font-semibold shadow-float transition-spring hover:scale-105 active:scale-95"
        >
          <Settings2 className="h-5 w-5" />
          Train My AI
        </Link>
      </div>
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
