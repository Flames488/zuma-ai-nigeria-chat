import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuthedServerFn } from "@/lib/authed-fn";
import { getMyBusiness, upsertMyBusiness } from "@/lib/server/business.functions";
import wabizzLogo from "@/assets/wabizz-logo.png";

/**
 * Validates and normalizes a Nigerian WhatsApp number.
 * Accepts: +234XXXXXXXXXX, 234XXXXXXXXXX, 0XXXXXXXXXX (Nigerian local).
 * Returns normalized E.164 form (+234...) or null if invalid.
 */
function normalizeNigerianWhatsApp(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  let core = digits;
  if (core.startsWith("+234")) core = core.slice(4);
  else if (core.startsWith("234")) core = core.slice(3);
  else if (core.startsWith("0")) core = core.slice(1);
  else if (core.startsWith("+")) {
    // Foreign number — accept if it has 8-14 digits after +
    const rest = core.slice(1);
    if (/^\d{8,14}$/.test(rest)) return "+" + rest;
    return null;
  } else {
    return null;
  }
  // Nigerian mobile numbers are 10 digits after the leading 0/234
  if (!/^\d{10}$/.test(core)) return null;
  // Mobile prefixes start with 7, 8, or 9
  if (!/^[789]/.test(core)) return null;
  return "+234" + core;
}

/** Returns minutes since midnight for an "HH:MM" string, or NaN. */
function toMinutes(t: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return NaN;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return NaN;
  return h * 60 + mm;
}

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Wabizz — Your WhatsApp Business Assistant" },
      {
        name: "description",
        content:
          "Activate your AI WhatsApp assistant in minutes. Built for Nigerian small businesses.",
      },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useRequireAuth();
  const callGet = useAuthedServerFn(getMyBusiness);
  const callUpsert = useAuthedServerFn(upsertMyBusiness);

  const [submitting, setSubmitting] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Fashion");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [productsList, setProductsList] = useState("");

  useEffect(() => {
    if (!session) return;
    setEmail(session.user.email ?? "");
    callGet().then((res) => {
      if (res.business) {
        setBusinessName(res.business.name);
        setBusinessType(res.business.type);
        setEmail(res.business.email || session.user.email || "");
        setWhatsapp(res.business.whatsapp);
        setOpenTime(res.business.open_time);
        setCloseTime(res.business.close_time);
        setProductsList(res.business.products_list);
      }
      setHydrating(false);
    });
  }, [session, callGet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || businessName.trim().length < 2)
      return toast.error("Oga, please enter your business name first 😄");
    if (businessName.trim().length > 80)
      return toast.error("Wahala! Business name too long — keep it under 80 characters ✂️");
    if (!businessType) return toast.error("Abeg, tell us what you sell 🛍️");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return toast.error("Oga, drop a valid email so we can send your receipts 📧");

    const normalized = normalizeNigerianWhatsApp(whatsapp);
    if (!normalized)
      return toast.error(
        "That WhatsApp number no correct o 📱 Use 0801 234 5678 or +234 801 234 5678",
      );

    const open = toMinutes(openTime);
    const close = toMinutes(closeTime);
    if (Number.isNaN(open) || Number.isNaN(close))
      return toast.error("Set proper open and close times ⏰");
    if (open === close)
      return toast.error("Haba! Open and close time can't be the same ⏰");
    if (close <= open)
      return toast.error(
        "Your closing time must be after opening time 🕐 (e.g. 09:00 → 20:00)",
      );
    if (close - open < 60)
      return toast.error("Open at least 1 hour — give your customers small breathing room 🙏");

    if (!productsList.trim() || productsList.trim().length < 5)
      return toast.error("Add at least one product so your AI knows what to sell 🧺");
    // Update field with normalized number so DB stores clean form
    setWhatsapp(normalized);

    setSubmitting(true);
    try {
      const res = await callUpsert({
        data: {
          name: businessName.trim(),
          type: businessType,
          email: email.trim(),
          whatsapp: normalizeNigerianWhatsApp(whatsapp) ?? whatsapp.trim(),
          open_time: openTime,
          close_time: closeTime,
          products_list: productsList.trim(),
          tone: "Friendly",
          custom_message: "",
        },
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Welcome ${businessName.trim()}! Your AI is warming up 🚀`);
      setTimeout(() => navigate({ to: "/pricing" }), 500);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || hydrating) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="mx-auto max-w-xl px-5 py-10 sm:py-16 animate-fade-in">
        <div className="flex items-center gap-3 mb-10">
          <img src={wabizzLogo} alt="Wabizz logo" className="h-11 w-11 rounded-2xl object-contain shadow-glow bg-card" />
          <div>
            <h2 className="text-lg font-bold tracking-tight">Wabizz</h2>
            <p className="text-xs text-muted-foreground">WhatsApp AI for Nigerian businesses</p>
          </div>
        </div>

        <div className="mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Setup in under 2 minutes
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            Let's get your AI ready to sell.
          </h1>
          <p className="mt-3 text-muted-foreground text-base">
            Tell us about your business. Your assistant will handle WhatsApp orders, answer
            customers, and never sleep — even at 2am.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-3xl p-6 sm:p-8 shadow-elegant border border-border/50 space-y-5 animate-slide-up"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              placeholder="e.g. Mama Nkechi Fashion"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">What do you sell?</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fashion">Fashion</SelectItem>
                <SelectItem value="Food & Drinks">Food & Drinks</SelectItem>
                <SelectItem value="Services">Services</SelectItem>
                <SelectItem value="Electronics">Electronics</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@yourbusiness.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We'll send your subscription receipts here.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder="+234 801 234 5678"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="open">Opens at</Label>
              <Input id="open" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="close">Closes at</Label>
              <Input id="close" type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="products">Your products & prices</Label>
            <Textarea
              id="products"
              placeholder={"Ankara gown – ₦15,000\nSenator wear – ₦25,000\nAso-ebi – ₦12,000"}
              rows={5}
              value={productsList}
              onChange={(e) => setProductsList(e.target.value)}
              className="resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              One item per line. Don't worry, you can edit anytime.
            </p>
          </div>

          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={submitting}>
            {submitting ? "Activating..." : "Activate My AI Assistant"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            No card needed. Free for your first 100 conversations.
          </p>
        </form>
      </div>
    </div>
  );
}
