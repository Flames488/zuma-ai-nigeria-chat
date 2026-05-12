import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuthedServerFn } from "@/lib/authed-fn";
import { listMyNiches, upsertNiche } from "@/lib/server/niche.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/niche/hospital")({
  head: () => ({
    meta: [
      { title: "Hospital module — Wabizz" },
      { name: "description", content: "Configure WhatsApp appointment booking for your hospital." },
    ],
  }),
  component: HospitalSettings,
});

function HospitalSettings() {
  useRequireAuth();
  const callList = useAuthedServerFn(listMyNiches);
  const callUpsert = useAuthedServerFn(upsertNiche);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(false);
  const [vitarUrl, setVitarUrl] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [faq, setFaq] = useState("");
  const [currency, setCurrency] = useState("NGN");

  useEffect(() => {
    callList({})
      .then((res) => {
        const h = res.niches.find((n: any) => n.niche_type === "hospital");
        if (h) {
          setActive(h.active);
          const c = h.config || {};
          setVitarUrl((c.vitar_base_url as string) || "");
          setHospitalName((c.hospital_name as string) || "");
          setFaq((c.faq as string) || "");
          setCurrency((c.currency as string) || "NGN");
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
          niche_type: "hospital",
          active,
          config: {
            vitar_base_url: vitarUrl.trim() || undefined,
            hospital_name: hospitalName.trim() || undefined,
            faq: faq.trim() || undefined,
            currency: currency.trim() || "NGN",
          },
        },
      });
      toast.success("Hospital module saved");
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
        <h1 className="text-3xl font-bold">Hospital module</h1>
        <p className="mt-2 text-muted-foreground">Connect to your Vitar booking backend to handle appointments via WhatsApp.</p>

        <div className="mt-8 space-y-6 rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Activate hospital module</Label>
              <p className="text-sm text-muted-foreground">When on, patient messages route to the booking flow before the generic AI.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <div>
            <Label htmlFor="hname">Hospital display name</Label>
            <Input id="hname" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="St. Nicholas Clinic" />
          </div>

          <div>
            <Label htmlFor="vurl">Vitar API base URL</Label>
            <Input id="vurl" value={vitarUrl} onChange={(e) => setVitarUrl(e.target.value)} placeholder="https://vitar.example.com/api" />
            <p className="mt-1 text-xs text-muted-foreground">Leave blank to use the system-wide default. The Vitar API key is stored as a backend secret.</p>
          </div>

          <div>
            <Label htmlFor="cur">Currency</Label>
            <Input id="cur" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="NGN" className="max-w-[120px]" />
          </div>

          <div>
            <Label htmlFor="faq">FAQ / pricing snippet</Label>
            <Textarea id="faq" value={faq} onChange={(e) => setFaq(e.target.value)} rows={5} placeholder="Consultation: ₦15,000. We open Mon–Sat, 8am–6pm…" />
          </div>

          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
