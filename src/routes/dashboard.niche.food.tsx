import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, UtensilsCrossed, ListOrdered } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuthedServerFn } from "@/lib/authed-fn";
import { listMyNiches, upsertNiche } from "@/lib/server/niche.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/niche/food")({
  head: () => ({
    meta: [
      { title: "Food trader module — Wabizz" },
      { name: "description", content: "Configure WhatsApp ordering for your kitchen or restaurant." },
    ],
  }),
  component: FoodSettings,
});

function FoodSettings() {
  useRequireAuth();
  const callList = useAuthedServerFn(listMyNiches);
  const callUpsert = useAuthedServerFn(upsertNiche);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [minOrder, setMinOrder] = useState("0");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [faq, setFaq] = useState("");

  useEffect(() => {
    callList({})
      .then((res) => {
        const f = res.niches.find((n: any) => n.niche_type === "food");
        if (f) {
          setActive(f.active);
          const c = f.config || {};
          setDeliveryFee(String(((c.delivery_fee_kobo as number) ?? 0) / 100));
          setMinOrder(String(((c.min_order_kobo as number) ?? 0) / 100));
          setOwnerPhone((c.owner_phone as string) || "");
          setFaq((c.delivery_faq as string) || "");
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [callList]);

  const save = async () => {
    setSaving(true);
    try {
      await callUpsert({
        data: {
          niche_type: "food",
          active,
          config: {
            delivery_fee_kobo: Math.round(Number(deliveryFee || "0") * 100),
            min_order_kobo: Math.round(Number(minOrder || "0") * 100),
            owner_phone: ownerPhone.trim() || undefined,
            delivery_faq: faq.trim() || undefined,
            currency: "NGN",
          },
        },
      });
      toast.success("Food module saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/dashboard/niche" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Niche modules
        </Link>
        <h1 className="text-3xl font-bold">Food trader module</h1>
        <p className="mt-2 text-muted-foreground">Take WhatsApp orders end-to-end with auto-generated Paystack links.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link to="/dashboard/niche/food/menu" className="flex items-center justify-between rounded-lg border bg-card p-4 hover:border-primary">
            <span className="flex items-center gap-2 font-medium"><UtensilsCrossed className="h-4 w-4" /> Manage menu</span>
            <span className="text-sm text-muted-foreground">→</span>
          </Link>
          <Link to="/dashboard/niche/food/orders" className="flex items-center justify-between rounded-lg border bg-card p-4 hover:border-primary">
            <span className="flex items-center gap-2 font-medium"><ListOrdered className="h-4 w-4" /> Recent orders</span>
            <span className="text-sm text-muted-foreground">→</span>
          </Link>
        </div>

        <div className="mt-6 space-y-6 rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Activate food module</Label>
              <p className="text-sm text-muted-foreground">Customer messages route through the menu/order flow first.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fee">Delivery fee (₦)</Label>
              <Input id="fee" inputMode="decimal" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="min">Minimum order (₦)</Label>
              <Input id="min" inputMode="decimal" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="own">Owner WhatsApp number (E.164)</Label>
            <Input id="own" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+2348012345678" />
            <p className="mt-1 text-xs text-muted-foreground">From this number you can send "status &lt;order-id&gt; preparing" etc.</p>
          </div>
          <div>
            <Label htmlFor="dfaq">Delivery FAQ</Label>
            <Textarea id="dfaq" value={faq} onChange={(e) => setFaq(e.target.value)} rows={4} placeholder="We deliver in Lekki Phase 1 between 11am – 9pm. ETA 30–45 min." />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
