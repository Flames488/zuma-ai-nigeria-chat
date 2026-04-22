import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Sparkles,
  ShoppingBag,
  Wallet,
  Clock,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zuma AI — Your Business Never Sleeps" },
      {
        name: "description",
        content:
          "AI-powered WhatsApp assistant for Nigerian businesses. Handles customers, takes orders, collects payments — automatically.",
      },
      { property: "og:title", content: "Zuma AI — Your Business Never Sleeps" },
      {
        property: "og:description",
        content:
          "AI-powered WhatsApp assistant for Nigerian businesses. Handles customers, takes orders, collects payments — automatically.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: MessageCircle,
    title: "Replies in seconds",
    desc: "Your AI answers WhatsApp messages 24/7 — even at 2am.",
  },
  {
    icon: ShoppingBag,
    title: "Takes orders for you",
    desc: "Captures customer details, sizes, quantities — all by chat.",
  },
  {
    icon: Wallet,
    title: "Collects payments",
    desc: "Generates Paystack links instantly so customers pay on the spot.",
  },
  {
    icon: Clock,
    title: "Never misses a sale",
    desc: "While you sleep, eat, or hustle — Zuma is closing deals.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Nav */}
      <header className="mx-auto max-w-5xl px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <MessageCircle className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-bold tracking-tight">Zuma AI</span>
        </div>
        <Link
          to="/pricing"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
        >
          Pricing
        </Link>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-3xl px-5 pt-8 pb-20 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Built for Nigerian businesses
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
          Your Business
          <br />
          Never Sleeps With{" "}
          <span className="bg-gradient-primary bg-clip-text text-transparent">Zuma AI</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          AI-powered WhatsApp assistant for Nigerian businesses. Handles customers, takes orders,
          collects payments — automatically.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/onboarding">
            <Button variant="hero" size="xl" className="w-full sm:w-auto">
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="outline" size="xl" className="w-full sm:w-auto">
              See pricing
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          No card needed · Setup in under 2 minutes
        </p>

        {/* Mock chat preview */}
        <div className="mt-14 mx-auto max-w-md bg-card rounded-3xl border border-border/50 shadow-elegant p-5 text-left animate-slide-up">
          <div className="flex items-center gap-2 pb-3 border-b border-border/50">
            <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              Z
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Zuma AI</p>
              <p className="text-[11px] text-success">online</p>
            </div>
          </div>
          <div className="space-y-2 mt-4 text-sm">
            <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%]">
              How much for the blue Ankara gown?
            </div>
            <div className="ml-auto bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
              Hi dear! 💙 The blue Ankara gown is ₦15,000. Want me to send a payment link?
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%]">
              Yes please
            </div>
          </div>
        </div>

        {/* Features */}
        <section className="mt-20 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card/80 backdrop-blur rounded-2xl p-5 border border-border/50 shadow-sm"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold tracking-tight">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Final CTA */}
        <section className="mt-16 bg-gradient-primary rounded-3xl p-8 sm:p-10 shadow-float text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to stop missing customers?
          </h2>
          <p className="mt-2 text-primary-foreground/85 text-sm sm:text-base">
            Activate your AI in 2 minutes. Free for the first 100 conversations.
          </p>
          <Link to="/onboarding" className="inline-block mt-6">
            <Button
              size="xl"
              className="bg-card text-foreground hover:bg-card/90 shadow-glow"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </section>
      </main>
    </div>
  );
}
