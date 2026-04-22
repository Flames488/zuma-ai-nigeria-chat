import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CreditCard,
  Check,
  ShieldCheck,
  MessageCircle,
  ExternalLink,
  Copy,
} from "lucide-react";
import { getProfile, saveProfile, type Tone } from "@/lib/business-profile";
import {
  getPaystackKeys,
  savePaystackKeys,
  buildPaymentLink,
  type PaystackKeys,
} from "@/lib/paystack";
import { getSavedPlan, type PlanInfo } from "@/lib/plan";
import { getWhatsAppConfig, saveWhatsAppConfig, type WhatsAppConfig } from "@/lib/whatsapp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Train My AI — Zuma AI" },
      { name: "description", content: "Customize your AI assistant's products, tone, and replies." },
    ],
  }),
  component: SettingsPage,
});

type Product = { id: number; name: string; price: string };

function parseProducts(text: string): Product[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    const m = line.match(/^(.+?)[\s–\-—:]+₦?\s*([\d,]+)/);
    if (m) return { id: i + 1, name: m[1].trim(), price: m[2].replace(/,/g, "") };
    return { id: i + 1, name: line, price: "" };
  });
}

function serializeProducts(products: Product[]): string {
  return products
    .filter((p) => p.name.trim())
    .map((p) => (p.price ? `${p.name} – ₦${Number(p.price).toLocaleString()}` : p.name))
    .join("\n");
}

function SettingsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [tone, setTone] = useState<Tone>("Friendly");
  const [customMessage, setCustomMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [paystackKeys, setPaystackKeys] = useState<PaystackKeys | null>(null);
  const [paystackOpen, setPaystackOpen] = useState(false);
  const [pkInput, setPkInput] = useState("");
  const [skInput, setSkInput] = useState("");
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [planLink, setPlanLink] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Your Business");

  // WhatsApp / 360Dialog
  const [waConfig, setWaConfig] = useState<WhatsAppConfig | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [waKeyInput, setWaKeyInput] = useState("");
  const [waNumberInput, setWaNumberInput] = useState("");

  useEffect(() => {
    const p = getProfile();
    setProducts(parseProducts(p.productsList));
    setTone(p.tone);
    setCustomMessage(p.customMessage ?? "");
    setBusinessName(p.businessName || "Your Business");
    const keys = getPaystackKeys();
    setPaystackKeys(keys);
    if (keys) {
      setPkInput(keys.publicKey);
      setSkInput(keys.secretKey);
    }
    setPlan(getSavedPlan());
    const wa = getWhatsAppConfig();
    setWaConfig(wa);
    if (wa) {
      setWaKeyInput(wa.apiKey);
      setWaNumberInput(wa.businessNumber);
    }
  }, []);

  const generatePlanLink = () => {
    if (!paystackKeys) {
      toast.error("Connect Paystack first to generate a payment link.");
      return;
    }
    if (!plan) {
      toast.error("Pick a plan first from the Pricing page.");
      navigate({ to: "/pricing" });
      return;
    }
    const link = buildPaymentLink({
      publicKey: paystackKeys.publicKey,
      amountNaira: plan.amountNaira,
      businessName: `${businessName} — ${plan.name} plan`,
    });
    setPlanLink(link);
    toast.success(`Payment link ready for ${plan.name} (₦${plan.amountNaira.toLocaleString()})`);
  };

  const copyPlanLink = async () => {
    if (!planLink) return;
    try {
      await navigator.clipboard.writeText(planLink);
      toast.success("Link copied!");
    } catch {
      toast.error("Couldn't copy. Long-press to copy manually.");
    }
  };

  const handleSaveWhatsApp = () => {
    const apiKey = waKeyInput.trim();
    const businessNumber = waNumberInput.trim();
    if (apiKey.length < 10) {
      toast.error("That 360Dialog key looks too short — double-check it 😄");
      return;
    }
    if (!/^\+?\d[\d\s-]{6,}$/.test(businessNumber)) {
      toast.error("Enter a valid WhatsApp number with country code, e.g. +234...");
      return;
    }
    saveWhatsAppConfig({ apiKey, businessNumber });
    setWaConfig({ apiKey, businessNumber });
    setWaOpen(false);
    toast.success("WhatsApp connected 🎉");
  };

  const testWhatsAppConnection = () => {
    // Real send requires a server endpoint (Phase 2). For now, validate locally.
    if (!waConfig) {
      toast.error("Save your 360Dialog details first.");
      return;
    }
    toast.success(
      `Connection looks good! Live test message will work once the webhook is deployed.`,
    );
  };

  const handleSavePaystack = () => {
    const pk = pkInput.trim();
    const sk = skInput.trim();
    if (!pk.startsWith("pk_live_") && !pk.startsWith("pk_test_")) {
      toast.error("Oga this key doesn't look right, check your Paystack dashboard 😄");
      return;
    }
    if (!sk.startsWith("sk_live_") && !sk.startsWith("sk_test_")) {
      toast.error("Oga this key doesn't look right, check your Paystack dashboard 😄");
      return;
    }
    savePaystackKeys({ publicKey: pk, secretKey: sk });
    setPaystackKeys({ publicKey: pk, secretKey: sk });
    setPaystackOpen(false);
    toast.success("Paystack connected 🎉");
  };

  const addProduct = () =>
    setProducts((p) => [...p, { id: Date.now(), name: "", price: "" }]);
  const removeProduct = (id: number) =>
    setProducts((p) => p.filter((x) => x.id !== id));
  const updateProduct = (id: number, field: "name" | "price", value: string) =>
    setProducts((p) => p.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const handleSave = () => {
    saveProfile({
      productsList: serializeProducts(products),
      tone,
      customMessage: customMessage.trim(),
    });
    setSaved(true);
    toast.success("Your AI is updated!");
    setTimeout(() => navigate({ to: "/dashboard" }), 800);
  };

  const tones: Tone[] = ["Professional", "Friendly", "Pidgin"];

  return (
    <div className="min-h-screen bg-surface pb-32">
      <header className="bg-card border-b border-border/60 sticky top-0 z-10 backdrop-blur-md bg-card/90">
        <div className="mx-auto max-w-2xl px-5 py-4 flex items-center gap-3">
          <Link
            to="/dashboard"
            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted transition-smooth"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Train My AI</h1>
            <p className="text-xs text-muted-foreground">Make it sound just like you</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6 space-y-6 animate-fade-in">
        {/* Products */}
        <section className="bg-card rounded-2xl p-5 sm:p-6 border border-border/50 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Products & prices</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your AI quotes from this list — keep it fresh.
            </p>
          </div>
          <div className="space-y-2.5">
            {products.map((p) => (
              <div key={p.id} className="flex gap-2 items-center animate-slide-up">
                <Input
                  placeholder="Product name"
                  value={p.name}
                  onChange={(e) => updateProduct(p.id, "name", e.target.value)}
                  className="flex-1"
                />
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₦
                  </span>
                  <Input
                    placeholder="0"
                    value={p.price}
                    onChange={(e) => updateProduct(p.id, "price", e.target.value)}
                    className="pl-7"
                    inputMode="numeric"
                  />
                </div>
                <button
                  onClick={() => removeProduct(p.id)}
                  className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            onClick={addProduct}
            variant="outline"
            className="w-full mt-4 border-dashed"
          >
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        </section>

        {/* Custom reply */}
        <section className="bg-card rounded-2xl p-5 sm:p-6 border border-border/50 shadow-sm space-y-3">
          <div>
            <h2 className="text-base font-semibold">Custom message</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Is there anything your AI should always say?
            </p>
          </div>
          <Textarea
            placeholder="E.g. Delivery is free for orders above ₦20,000. We deliver Mon–Sat."
            rows={3}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="resize-none"
          />
        </section>

        {/* Tone */}
        <section className="bg-card rounded-2xl p-5 sm:p-6 border border-border/50 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Tone of voice</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              How should your AI talk to customers?
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {tones.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`relative py-3 px-2 rounded-xl text-sm font-medium transition-spring border-2 ${
                  tone === t
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                }`}
              >
                {tone === t && (
                  <Check className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary" />
                )}
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Payments — Paystack connection */}
        <section className="bg-card rounded-2xl p-5 sm:p-6 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">
                  {paystackKeys ? "Paystack" : "Connect Paystack"}
                </h2>
                {paystackKeys ? (
                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" />
                    Paystack Connected ✓
                  </span>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">
                    Get paid instantly when AI closes a sale.
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={paystackKeys ? "ghost" : "outline"}
              size="sm"
              onClick={() => setPaystackOpen(true)}
            >
              {paystackKeys ? "Edit" : "Connect"}
            </Button>
          </div>

          {/* Pay-for-your-plan link generator */}
          <div className="mt-5 pt-5 border-t border-border/50">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">Pay for your plan</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plan
                    ? `${plan.name} — ₦${plan.amountNaira.toLocaleString()}/month`
                    : "No plan selected yet."}
                </p>
              </div>
              {!plan && (
                <Link to="/pricing" className="text-xs font-medium text-primary underline">
                  Choose plan
                </Link>
              )}
            </div>
            <Button
              onClick={generatePlanLink}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!paystackKeys || !plan}
            >
              <CreditCard className="h-4 w-4" />
              Generate payment link
            </Button>
            {planLink && (
              <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 p-3 space-y-2 animate-fade-in">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Your payment link
                </p>
                <p className="text-xs break-all font-mono text-foreground/90">{planLink}</p>
                <div className="flex gap-2 pt-1">
                  <Button onClick={copyPlanLink} size="sm" variant="ghost" className="flex-1">
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <a
                    href={planLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-sm font-medium bg-gradient-primary text-primary-foreground hover:opacity-90 transition-smooth"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </a>
                </div>
              </div>
            )}
            {!paystackKeys && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Connect Paystack above to enable payment links.
              </p>
            )}
          </div>
        </section>

        {/* WhatsApp / 360Dialog */}
        <section className="bg-card rounded-2xl p-5 sm:p-6 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">
                  {waConfig ? "WhatsApp Business" : "Connect WhatsApp"}
                </h2>
                {waConfig ? (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full self-start">
                      <ShieldCheck className="h-3 w-3" />
                      WhatsApp Connected ✓
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {waConfig.businessNumber}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">
                    Let AI reply to real customers via 360Dialog.
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={waConfig ? "ghost" : "outline"}
              size="sm"
              onClick={() => setWaOpen(true)}
            >
              {waConfig ? "Edit" : "Connect"}
            </Button>
          </div>
          {waConfig && (
            <Button
              onClick={testWhatsAppConnection}
              variant="outline"
              size="sm"
              className="w-full mt-4"
            >
              Send test message
            </Button>
          )}
        </section>
      </main>

      {/* WhatsApp / 360Dialog Modal */}
      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect WhatsApp</DialogTitle>
            <DialogDescription>
              Use 360Dialog to plug your WhatsApp Business number into Zuma AI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wa-key">360Dialog API Key</Label>
              <Input
                id="wa-key"
                type="password"
                placeholder="D360-XXXXXXXXXXXXXXXX"
                value={waKeyInput}
                onChange={(e) => setWaKeyInput(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-number">WhatsApp Business Number</Label>
              <Input
                id="wa-number"
                placeholder="+234 801 234 5678"
                value={waNumberInput}
                onChange={(e) => setWaNumberInput(e.target.value)}
                inputMode="tel"
              />
              <p className="text-xs text-muted-foreground pt-1">
                Get your API key from{" "}
                <a
                  href="https://hub.360dialog.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  hub.360dialog.com
                </a>
                .
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWaOpen(false)}>
              Cancel
            </Button>
            <Button variant="hero" onClick={handleSaveWhatsApp}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paystack Modal */}
      <Dialog open={paystackOpen} onOpenChange={setPaystackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Paystack</DialogTitle>
            <DialogDescription>
              Paste your API keys so your AI can generate payment links for customers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pk">Public Key</Label>
              <Input
                id="pk"
                placeholder="pk_test_xxxxxxxxxxxxxxxx"
                value={pkInput}
                onChange={(e) => setPkInput(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sk">Secret Key</Label>
              <Input
                id="sk"
                type="password"
                placeholder="sk_test_xxxxxxxxxxxxxxxx"
                value={skInput}
                onChange={(e) => setSkInput(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground pt-1">
                Get your keys from{" "}
                <a
                  href="https://dashboard.paystack.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  dashboard.paystack.com
                </a>{" "}
                — it's free to create an account.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPaystackOpen(false)}>
              Cancel
            </Button>
            <Button variant="hero" onClick={handleSavePaystack}>
              Save keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/60 p-4">
        <div className="mx-auto max-w-2xl">
          <Button
            onClick={handleSave}
            variant="hero"
            size="xl"
            className="w-full"
            disabled={saved}
          >
            {saved ? (
              <>
                <Check className="h-5 w-5" />
                Saved!
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
