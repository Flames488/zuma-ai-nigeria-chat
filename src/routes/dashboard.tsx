import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { getProfile } from "@/lib/business-profile";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Zuma AI" },
      { name: "description", content: "Your live AI assistant overview and conversations." },
    ],
  }),
  component: Dashboard,
});

const stats = [
  {
    label: "Conversations Today",
    value: "47",
    delta: "+12 from yesterday",
    icon: MessageCircle,
  },
  { label: "Orders Received", value: "18", delta: "+5 from yesterday", icon: ShoppingBag },
  { label: "Revenue Today", value: "₦142,500", delta: "+₦38,000", icon: Wallet },
];

type Status = "Handled" | "Needs You" | "Order Placed";

const conversations: {
  name: string;
  initials: string;
  preview: string;
  time: string;
  status: Status;
}[] = [
  {
    name: "Chioma Okeke",
    initials: "CO",
    preview: "Please send me the price of the blue Ankara gown 🙏",
    time: "2m ago",
    status: "Order Placed",
  },
  {
    name: "Tunde Bakare",
    initials: "TB",
    preview: "Do you deliver to Ikeja today?",
    time: "11m ago",
    status: "Handled",
  },
  {
    name: "Aisha Mohammed",
    initials: "AM",
    preview: "Can I get a discount if I buy 3?",
    time: "24m ago",
    status: "Needs You",
  },
  {
    name: "Emeka Johnson",
    initials: "EJ",
    preview: "Thank you! I'll transfer now.",
    time: "1h ago",
    status: "Order Placed",
  },
  {
    name: "Bola Adeyemi",
    initials: "BA",
    preview: "What time do you close today?",
    time: "2h ago",
    status: "Handled",
  },
];

const statusStyles: Record<Status, string> = {
  Handled: "bg-muted text-muted-foreground",
  "Needs You": "bg-warning/15 text-warning-foreground border border-warning/30",
  "Order Placed": "bg-success/15 text-success border border-success/30",
};

const statusIcon: Record<Status, typeof CheckCircle2> = {
  Handled: CheckCircle2,
  "Needs You": AlertCircle,
  "Order Placed": Package,
};

function Dashboard() {
  const [name, setName] = useState("Your Business");
  useEffect(() => setName(getProfile().businessName || "Your Business"), []);

  return (
    <div className="min-h-screen bg-surface pb-28">
      {/* Header */}
      <header className="bg-card border-b border-border/60 sticky top-0 z-10 backdrop-blur-md bg-card/90">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <h1 className="text-lg font-bold tracking-tight truncate">{name}</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-success/15 border border-success/30 px-3 py-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-soft absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-xs font-semibold text-success">AI is Live</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 space-y-6 animate-fade-in">
        <div className="px-1">
          <h2 className="text-xl font-bold tracking-tight">Today at {name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here's how your AI is performing right now.
          </p>
        </div>

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats.map((s) => (
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
              <div className="mt-1 flex items-center gap-1 text-xs text-success">
                <TrendingUp className="h-3 w-3" />
                {s.delta}
              </div>
            </div>
          ))}
        </section>

        {/* Conversations */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold">Recent conversations</h2>
            <span className="text-xs text-muted-foreground">Live feed</span>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
            {conversations.map((c, i) => {
              const Icon = statusIcon[c.status];
              return (
                <div
                  key={c.name}
                  className={`flex items-start gap-3 p-4 transition-smooth hover:bg-muted/50 ${
                    i !== conversations.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                    {c.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{c.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{c.preview}</p>
                    <div
                      className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyles[c.status]}`}
                    >
                      <Icon className="h-3 w-3" />
                      {c.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Floating actions */}
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
