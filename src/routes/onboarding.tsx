import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { Sparkles, MessageCircle } from "lucide-react";
import { saveProfile } from "@/lib/business-profile";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Zuma AI — Your WhatsApp Business Assistant" },
      {
        name: "description",
        content:
          "Activate your AI WhatsApp assistant in minutes. Built for Nigerian small businesses.",
      },
      { property: "og:title", content: "Zuma AI — Your WhatsApp Business Assistant" },
      {
        property: "og:description",
        content: "Let AI handle your WhatsApp orders, replies, and customers — 24/7.",
      },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Fashion");
  const [whatsapp, setWhatsapp] = useState("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [productsList, setProductsList] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName.trim()) {
      toast.error("Oga, please enter your business name first 😄");
      return;
    }
    if (!businessType) {
      toast.error("Abeg, tell us what you sell 🛍️");
      return;
    }
    const cleanedNumber = whatsapp.replace(/[\s-]/g, "");
    if (!cleanedNumber || cleanedNumber.replace(/^\+/, "").length < 10) {
      toast.error("Drop a valid WhatsApp number, my friend 📱");
      return;
    }
    if (!openTime || !closeTime) {
      toast.error("When do you open and close? Set your business hours ⏰");
      return;
    }
    if (openTime === closeTime) {
      toast.error("Your opening and closing time can't be the same now 😅");
      return;
    }
    if (!productsList.trim() || productsList.trim().length < 5) {
      toast.error("Add at least one product so your AI knows what to sell 🧺");
      return;
    }

    setSubmitting(true);
    saveProfile({
      businessName: businessName.trim(),
      businessType,
      whatsapp: whatsapp.trim(),
      openTime,
      closeTime,
      productsList: productsList.trim(),
      tone: "Friendly",
    });
    toast.success(`Welcome ${businessName.trim()}! Your AI is warming up 🚀`);
    setTimeout(() => navigate({ to: "/pricing" }), 600);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="mx-auto max-w-xl px-5 py-10 sm:py-16 animate-fade-in">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-11 w-11 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <MessageCircle className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Zuma AI</h2>
            <p className="text-xs text-muted-foreground">WhatsApp business, on autopilot</p>
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
              <Input
                id="open"
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="close">Closes at</Label>
              <Input
                id="close"
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
              />
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

          <Button
            type="submit"
            variant="hero"
            size="xl"
            className="w-full"
            disabled={submitting}
          >
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
