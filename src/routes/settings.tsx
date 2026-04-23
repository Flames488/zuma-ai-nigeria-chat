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
  Loader2,
} from "lucide-react";
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
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuthedServerFn } from "@/lib/authed-fn";
import { getMyBusiness, updateMyBusiness } from "@/lib/server/business.functions";
import {
  getPaystackStatus,
  savePaystackKeys,
  getWhatsAppStatus,
  saveWhatsAppConfig,
} from "@/lib/server/keys.functions";

type Tone = "Professional" | "Friendly" | "Pidgin";
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

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Train My AI — Zuma AI" },
      { name: "description", content: "Customize your AI assistant's products, tone, and replies." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useRequireAuth();
  const callBiz = useAuthedServerFn(getMyBusiness);
  const callUpdate = useAuthedServerFn(updateMyBusiness);
  const callPS = useAuthedServerFn(getPaystackStatus);
  const callSavePS = useAuthedServerFn(savePaystackKeys);
  const callWA = useAuthedServerFn(getWhatsAppStatus);
  const callSaveWA = useAuthedServerFn(saveWhatsAppConfig);

  const [hydrating, setHydrating] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [tone, setTone] = useState<Tone>("Friendly");
  const [customMessage, setCustomMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const [paystackConnected, setPaystackConnected] = useState(false);
  const [paystackOpen, setPaystackOpen] = useState(false);
  const [pkInput, setPkInput] = useState("");
  const [skInput, setSkInput] = useState("");

  const [waConnected, setWaConnected] = useState(false);
  const [waNumber, setWaNumber] = useState<string | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [waKeyInput, setWaKeyInput] = useState("");
  const [waNumberInput, setWaNumberInput] = useState("");

  useEffect(() => {
    if (!session) return;
    Promise.all([callBiz(), callPS(), callWA()]).then(([biz, ps, wa]) => {
      if (!biz.business) {
        navigate({ to: "/onboarding" });
        return;
      }
      setProducts(parseProducts(biz.business.products_list));
      setTone(biz.business.tone as Tone);
      setCustomMessage(biz.business.custom_message ?? "");
      setPaystackConnected(ps.connected);
      if (ps.publicKey) setPkInput(ps.publicKey);
      setWaConnected(wa.connected);
      setWaNumber(wa.businessNumber);
      if (wa.businessNumber) setWaNumberInput(wa.businessNumber);
      setHydrating(false);
    });
  }, [session, callBiz, callPS, callWA, navigate]);

  const handleSavePaystack = async () => {
    const pk = pkInput.trim();
    const sk = skInput.trim();
    if (!pk.startsWith("pk_live_") && !pk.startsWith("pk_test_"))
      return toast.error("Oga this key doesn't look right, check your Paystack dashboard 😄");
    if (!sk.startsWith("sk_live_") && !sk.startsWith("sk_test_"))
      return toast.error("Oga this secret key doesn't look right 😄");
    const res = await callSavePS({ data: { publicKey: pk, secretKey: sk } });
    if (!res.ok) return toast.error(res.error ?? "Couldn't save keys");
    setPaystackConnected(true);
    setPaystackOpen(false);
    toast.success("Paystack connected 🎉");
  };

  const handleSaveWhatsApp = async () => {
    const apiKey = waKeyInput.trim();
    const number = waNumberInput.trim();
    if (apiKey.length < 10) return toast.error("That 360Dialog key looks too short — double-check it 😄");
    if (!/^\+?\d[\d\s-]{6,}$/.test(number))
      return toast.error("Enter a valid WhatsApp number with country code, e.g. +234...");
    const res = await callSaveWA({ data: { apiKey, businessNumber: number } });
    if (!res.ok) return toast.error(res.error ?? "Couldn't save");
    setWaConnected(true);
    setWaNumber(number.replace(/[\s-]/g, ""));
    setWaOpen(false);
    toast.success("WhatsApp connected 🎉");
  };

  const addProduct = () => setProducts((p) => [...p, { id: Date.now(), name: "", price: "" }]);
  const removeProduct = (id: number) => setProducts((p) => p.filter((x) => x.id !== id));
  const updateProduct = (id: number, field: "name" | "price", value: string) =>
    setProducts((p) => p.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const handleSave = async () => {
    const res = await callUpdate({
      data: {
        products_list: serializeProducts(products),
        tone,
        custom_message: customMessage.trim(),
      },
    });
    if (res.error) return toast.error(res.error);
    setSaved(true);
    toast.success("Your AI is updated!");
    setTimeout(() => navigate({ to: "/dashboard" }), 600);
  };

  const tones: Tone[] = ["Professional", "Friendly", "Pidgin"];

  if (authLoading || hydrating) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-32">
      <header className="bg-card border-b border-border/60 sticky top-0 z-10 backdrop-blur-md bg-card/90">
        <div className="mx-auto max-w-2xl px-5 py-4 flex items-center gap-3">
          <Link to="/dashboard" className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted transition-smooth">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Train My AI</h1>
            <p className="text-xs text-muted-foreground">Make it sound just like you</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6 space-y-6 animate-fade-in">
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
                <Input placeholder="Product name" value={p.name} onChange={(e) => updateProduct(p.id, "name", e.target.value)} className="flex-1" />
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₦</span>
                  <Input placeholder="0" value={p.price} onChange={(e) => updateProduct(p.id, "price", e.target.value)} className="pl-7" inputMode="numeric" />
                </div>
                <button onClick={() => removeProduct(p.id)} className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button onClick={addProduct} variant="outline" className="w-full mt-4 border-dashed">
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        </section>

        <section className="bg-card rounded-2xl p-5 sm:p-6 border border-border/50 shadow-sm space-y-3">
          <div>
            <h2 className="text-base font-semibold">Custom message</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Is there anything your AI should always say?</p>
          </div>
          <Textarea placeholder="E.g. Delivery is free for orders above ₦20,000." rows={3} value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} className="resize-none" />
        </section>

        <section className="bg-card rounded-2xl p-5 sm:p-6 border border-border/50 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Tone of voice</h2>
            <p className="text-xs text-muted-foreground mt-0.5">How should your AI talk to customers?</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {tones.map((t) => (
              <button key={t} onClick={() => setTone(t)} className={`relative py-3 px-2 rounded-xl text-sm font-medium transition-spring border-2 ${tone === t ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border bg-background text-foreground hover:border-primary/40"}`}>
                {tone === t && <Check className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary" />}
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 sm:p-6 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">{paystackConnected ? "Paystack" : "Connect Paystack"}</h2>
                {paystackConnected ? (
                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" />
                    Paystack Connected ✓
                  </span>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">Get paid instantly when AI closes a sale.</p>
                )}
              </div>
            </div>
            <Button variant={paystackConnected ? "ghost" : "outline"} size="sm" onClick={() => setPaystackOpen(true)}>
              {paystackConnected ? "Edit" : "Connect"}
            </Button>
          </div>
        </section>

        <section className="bg-card rounded-2xl p-5 sm:p-6 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">{waConnected ? "WhatsApp Business" : "Connect WhatsApp"}</h2>
                {waConnected ? (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full self-start">
                      <ShieldCheck className="h-3 w-3" />
                      WhatsApp Connected ✓
                    </span>
                    {waNumber && <span className="text-[11px] text-muted-foreground truncate">{waNumber}</span>}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">Let AI reply to real customers via 360Dialog.</p>
                )}
              </div>
            </div>
            <Button variant={waConnected ? "ghost" : "outline"} size="sm" onClick={() => setWaOpen(true)}>
              {waConnected ? "Edit" : "Connect"}
            </Button>
          </div>
        </section>
      </main>

      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect WhatsApp</DialogTitle>
            <DialogDescription>Use 360Dialog to plug your WhatsApp Business number into Zuma AI.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wa-key">360Dialog API Key</Label>
              <Input id="wa-key" type="password" placeholder="D360-XXXXXXXXXXXXXXXX" value={waKeyInput} onChange={(e) => setWaKeyInput(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-number">WhatsApp Business Number</Label>
              <Input id="wa-number" placeholder="+234 801 234 5678" value={waNumberInput} onChange={(e) => setWaNumberInput(e.target.value)} inputMode="tel" />
              <p className="text-xs text-muted-foreground pt-1">
                Get your API key from{" "}
                <a href="https://hub.360dialog.com" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">hub.360dialog.com</a>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWaOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSaveWhatsApp}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paystackOpen} onOpenChange={setPaystackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Paystack</DialogTitle>
            <DialogDescription>Paste your API keys so your AI can generate payment links for customers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pk">Public Key</Label>
              <Input id="pk" placeholder="pk_test_xxxxxxxxxxxxxxxx" value={pkInput} onChange={(e) => setPkInput(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sk">Secret Key</Label>
              <Input id="sk" type="password" placeholder="sk_test_xxxxxxxxxxxxxxxx" value={skInput} onChange={(e) => setSkInput(e.target.value)} autoComplete="off" />
              <p className="text-xs text-muted-foreground pt-1">
                Get your keys from{" "}
                <a href="https://dashboard.paystack.com" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">dashboard.paystack.com</a>{" "}
                — it's free to create an account. Keys are stored securely server-side.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPaystackOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSavePaystack}>Save keys</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/60 p-4">
        <div className="mx-auto max-w-2xl">
          <Button onClick={handleSave} variant="hero" size="xl" className="w-full" disabled={saved}>
            {saved ? (<><Check className="h-5 w-5" />Saved!</>) : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
