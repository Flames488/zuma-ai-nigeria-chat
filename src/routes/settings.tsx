import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, CreditCard, Check } from "lucide-react";

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
type Tone = "Professional" | "Friendly" | "Pidgin";

function SettingsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([
    { id: 1, name: "Ankara gown", price: "15000" },
    { id: 2, name: "Senator wear", price: "25000" },
    { id: 3, name: "Aso-ebi", price: "12000" },
  ]);
  const [tone, setTone] = useState<Tone>("Friendly");
  const [saved, setSaved] = useState(false);

  const addProduct = () =>
    setProducts((p) => [...p, { id: Date.now(), name: "", price: "" }]);
  const removeProduct = (id: number) =>
    setProducts((p) => p.filter((x) => x.id !== id));
  const updateProduct = (id: number, field: "name" | "price", value: string) =>
    setProducts((p) => p.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const handleSave = () => {
    setSaved(true);
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

        {/* Payments */}
        <section className="bg-card rounded-2xl p-5 sm:p-6 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">Connect Paystack</h2>
                <p className="text-xs text-muted-foreground truncate">
                  Get paid instantly when AI closes a sale.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Connect
            </Button>
          </div>
        </section>
      </main>

      {/* Sticky save */}
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
