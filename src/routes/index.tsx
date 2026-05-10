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
  CheckCircle2,
  Bot,
  Zap,
  TrendingUp,
  Star,
  Quote,
} from "lucide-react";
import wabizzLogo from "@/assets/wabizz-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wabizz — Your Business Never Sleeps" },
      {
        name: "description",
        content:
          "AI-powered WhatsApp assistant for Nigerian businesses. Handles customers, takes orders, collects payments — automatically.",
      },
      { property: "og:title", content: "Wabizz — Your Business Never Sleeps" },
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
    desc: "While you sleep, eat, or hustle — Wabizz is closing deals.",
  },
];

type ChatMsg = { from: "customer" | "bot"; text: string; time: string };

const demoConversation: ChatMsg[] = [
  { from: "customer", text: "Good morning, una dey sell Ankara?", time: "9:02" },
  { from: "bot", text: "Good morning dear! 🌞 Yes o, we sell quality Ankara gowns, senator wear and Aso-ebi. What style catch your eye today?", time: "9:02" },
  { from: "customer", text: "I dey find something for owambe this Saturday", time: "9:03" },
  { from: "bot", text: "Perfect timing! 💃 Our top picks for owambe:\n• Royal Blue Ankara Gown — ₦15,000\n• Emerald Senator Set — ₦22,000\n• Aso-ebi Lace (3 yards) — ₦18,500\nWhich one catch your eye?", time: "9:03" },
  { from: "customer", text: "How much for the blue Ankara gown again?", time: "9:04" },
  { from: "bot", text: "The Royal Blue Ankara gown is ₦15,000 💙 — premium wax fabric, fits sizes 8 to 18. Want me to reserve one for you?", time: "9:04" },
  { from: "customer", text: "Yes please. Size 12.", time: "9:05" },
  { from: "bot", text: "Sweet 🙌 Size 12 reserved. Where should we deliver, and do you want same-day or next-day dispatch?", time: "9:05" },
  { from: "customer", text: "Lekki Phase 1. Same-day if possible 🙏", time: "9:06" },
  { from: "bot", text: "Same-day to Lekki Phase 1 = ₦2,500 delivery (rider arrives 2 – 4pm). Total comes to ₦17,500. Shall I proceed?", time: "9:06" },
  { from: "customer", text: "Yes proceed", time: "9:07" },
  { from: "bot", text: "Lovely ✨ Just need your name & phone number to tag the order.", time: "9:07" },
  { from: "customer", text: "Adaeze Okoro, 0803 555 1212", time: "9:08" },
  { from: "bot", text: "Thanks Adaeze 🙌 Here's your secure Paystack link:\nhttps://paystack.com/pay/wabizz-x84n\n\nReply PAID once payment goes through and we'll dispatch immediately.", time: "9:08" },
  { from: "customer", text: "Paying now…", time: "9:10" },
  { from: "customer", text: "PAID ✅", time: "9:12" },
  { from: "bot", text: "Payment confirmed! 🎉 Order #WBZ-2041 is being packed now.", time: "9:12" },
  { from: "bot", text: "Dispatch rider Tunde 🛵 will arrive Lekki Phase 1 between 2 – 4pm today. I'll send tracking shortly.", time: "9:13" },
  { from: "customer", text: "You guys are too sweet 😍", time: "9:14" },
  { from: "bot", text: "Aww thank you Adaeze 💚 Enjoy the owambe — send us a pic, we go gas you up! 📸", time: "9:14" },
];

const stats = [
  { value: "24/7", label: "Always online" },
  { value: "<5s", label: "Reply time" },
  { value: "3x", label: "More sales" },
  { value: "0", label: "Missed orders" },
];

const steps = [
  { icon: Bot, title: "Connect WhatsApp", desc: "Link your business number in 2 minutes — no code, no stress." },
  { icon: Sparkles, title: "Train your AI", desc: "Add your products, prices and tone. Wabizz learns your business." },
  { icon: Zap, title: "Go live", desc: "Customers chat, AI replies, payments land in your account." },
];

const testimonials = [
  {
    name: "Chioma A.",
    role: "Fashion Designer, Lagos",
    quote: "I used to lose customers at night. Now Wabizz closes orders while I sleep. My sales tripled in one month.",
  },
  {
    name: "Tunde B.",
    role: "Skincare Brand, Abuja",
    quote: "It replies in pidgin, takes orders, sends Paystack links. My DM is now an actual shop.",
  },
  {
    name: "Aisha M.",
    role: "Food Vendor, Ibadan",
    quote: "Setup took 2 minutes. Customers think it's me typing. Best ₦12k I ever spent monthly.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/60 border-b border-border/40">
        <div className="mx-auto max-w-6xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={wabizzLogo} alt="Wabizz" className="h-9 w-9 rounded-xl object-contain bg-card shadow-sm" />
            <span className="font-bold tracking-tight text-lg">Wabizz</span>
          </div>
          <nav className="hidden sm:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#demo" className="hover:text-foreground transition-smooth">Demo</a>
            <a href="#how" className="hover:text-foreground transition-smooth">How it works</a>
            <Link to="/pricing" className="hover:text-foreground transition-smooth">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-block text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth">
              Sign in
            </Link>
            <Link to="/auth">
              <Button size="sm" variant="hero">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-5 pt-12 sm:pt-20 pb-20 animate-fade-in">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Built for Nigerian businesses
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Your Business
              <br />
              Never Sleeps With{" "}
              <span
                className="text-primary"
                style={{
                  backgroundImage: "var(--gradient-primary)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}
              >
                Wabizz
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              AI-powered WhatsApp assistant for Nigerian businesses. Handles customers, takes orders,
              collects payments — automatically.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
              <Link to="/onboarding" className="w-full sm:w-auto">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/pricing" className="w-full sm:w-auto">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  See pricing
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              No card needed · Setup in under 2 minutes
            </p>

            <div className="mt-8 grid grid-cols-4 gap-2 max-w-md mx-auto lg:mx-0">
              {stats.map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-primary">{s.value}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Trust strip */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> 360Dialog & Twilio ready</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Paystack payments</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Pidgin · English · Yoruba tone</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Hosted in the cloud</span>
        </div>

        {/* Live demo */}
        <section id="demo" className="mt-24 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
              <MessageCircle className="h-3.5 w-3.5" />
              Live demo
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Watch Wabizz close a real sale
            </h2>
            <p className="mt-3 text-muted-foreground">
              A real conversation between a Lagos customer and a Wabizz-powered fashion store. From
              "good morning" to "PAID" — all on autopilot.
            </p>
          </div>

          <div className="mt-10 grid lg:grid-cols-[420px_1fr] gap-8 items-center">
            <div className="mx-auto">
              <PhoneFrame conversation={demoConversation} animated />
            </div>

            <div className="space-y-4">
              {[
                { icon: Bot, title: "Understands intent", desc: "Knows the customer wants the blue Ankara gown — not just any product." },
                { icon: ShoppingBag, title: "Captures order details", desc: "Collects size, delivery address and contact without you lifting a finger." },
                { icon: Wallet, title: "Sends payment link", desc: "Generates a Paystack link in real time — money lands in your bank." },
                { icon: TrendingUp, title: "Closes the loop", desc: "Confirms payment, schedules dispatch, and delights your customer." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold tracking-tight">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
              <Link to="/simulator" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-2">
                Try the live simulator <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mt-24 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Live in 3 simple steps
            </h2>
            <p className="mt-3 text-muted-foreground">
              No tech skills needed. If you can send a WhatsApp message, you can run Wabizz.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {steps.map((step, i) => (
              <div key={step.title} className="relative bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
                <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-glow">
                  {i + 1}
                </div>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold tracking-tight">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card/80 backdrop-blur rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-elegant transition-smooth"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold tracking-tight">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Testimonials */}
        <section className="mt-24">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Loved by hustlers across Naija
            </h2>
            <p className="mt-3 text-muted-foreground">
              From Lagos boutiques to Ibadan kitchens — Wabizz is closing sales 24/7.
            </p>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
                <Quote className="h-6 w-6 text-primary/40 mb-3" />
                <p className="text-sm leading-relaxed">{t.quote}</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary text-primary-foreground font-bold flex items-center justify-center">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-0.5 text-warning">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-24 bg-gradient-primary rounded-3xl p-8 sm:p-12 shadow-float text-primary-foreground text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to stop missing customers?
            </h2>
            <p className="mt-2 text-primary-foreground/85 text-sm sm:text-base">
              Activate your AI in 2 minutes. 7-day free trial. No card needed.
            </p>
          </div>
          <Link to="/onboarding" className="inline-block mt-6 sm:mt-0 shrink-0">
            <Button size="xl" className="bg-card text-foreground hover:bg-card/90 shadow-glow">
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </section>

        <footer className="mt-16 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={wabizzLogo} alt="" className="h-6 w-6 rounded-md object-contain bg-card" />
            <span>© {new Date().getFullYear()} Wabizz. Made in Nigeria 🇳🇬</span>
          </div>
          <div className="flex gap-5">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

function PhoneFrame({ conversation, animated = false }: { conversation: ChatMsg[]; animated?: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[340px] aspect-[9/19] bg-foreground rounded-[2.5rem] p-2.5 shadow-float">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 h-5 w-24 bg-foreground rounded-b-2xl z-10" />
      <div className="h-full w-full bg-[#e5ddd5] rounded-[2rem] overflow-hidden flex flex-col">
        {/* WhatsApp header */}
        <div className="bg-[#075e54] text-white px-4 pt-8 pb-3 flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">W</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">Mama Nkechi Fashion</p>
            <p className="text-[10px] text-white/80">online · powered by Wabizz</p>
          </div>
          <Bot className="h-4 w-4 text-white/80" />
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M0 20h40M20 0v40' stroke='%23d4cdc3' stroke-width='0.5' opacity='0.4'/%3E%3C/svg%3E\")",
          }}
        >
          {conversation.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.from === "bot" ? "justify-end" : "justify-start"} ${
                animated ? "animate-fade-in" : ""
              }`}
              style={animated ? { animationDelay: `${i * 0.15}s`, animationFillMode: "both" } : undefined}
            >
              <div
                className={`max-w-[80%] px-2.5 py-1.5 rounded-lg text-[12.5px] leading-snug shadow-sm whitespace-pre-line ${
                  m.from === "bot"
                    ? "bg-[#dcf8c6] text-foreground rounded-tr-sm"
                    : "bg-white text-foreground rounded-tl-sm"
                }`}
              >
                {m.text}
                <div className="text-[9px] text-muted-foreground/70 text-right mt-0.5">{m.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
