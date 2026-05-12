import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuthedServerFn } from "@/lib/authed-fn";
import {
  createMenuItem,
  deleteMenuItem,
  listMyMenu,
  updateMenuItem,
} from "@/lib/server/niche.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/niche/food/menu")({
  head: () => ({ meta: [{ title: "Menu — Wabizz" }] }),
  component: MenuPage,
});

type Item = { id: string; name: string; description: string; category: string; price_kobo: number; available: boolean };

function MenuPage() {
  useRequireAuth();
  const callList = useAuthedServerFn(listMyMenu);
  const callCreate = useAuthedServerFn(createMenuItem);
  const callUpdate = useAuthedServerFn(updateMenuItem);
  const callDelete = useAuthedServerFn(deleteMenuItem);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Mains");

  const refresh = useCallback(async () => {
    try {
      const data = await callList({});
      setItems(data as Item[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [callList]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = async () => {
    if (!name.trim() || !price) return toast.error("Name and price required");
    try {
      await callCreate({ data: { name: name.trim(), price_kobo: Math.round(Number(price) * 100), category, description: "", available: true } });
      setName(""); setPrice("");
      toast.success("Item added");
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Add failed"); }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard/niche/food" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Food module
        </Link>
        <h1 className="text-3xl font-bold">Menu</h1>

        <div className="mt-6 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <Input placeholder="Item name (e.g. Jollof rice)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input placeholder="Price ₦" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Button onClick={add}><Plus className="mr-2 h-4 w-4" />Add</Button>
        </div>

        <div className="mt-6 rounded-xl border bg-card">
          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No items yet — add your first dish above.</div>
          ) : (
            <ul className="divide-y">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <div className="font-medium">{it.name} <span className="ml-2 text-xs text-muted-foreground">{it.category}</span></div>
                    <div className="text-sm text-muted-foreground">₦{(it.price_kobo / 100).toLocaleString("en-NG")}</div>
                  </div>
                  <Switch
                    checked={it.available}
                    onCheckedChange={async (v) => {
                      try { await callUpdate({ data: { id: it.id, patch: { available: v } } }); refresh(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
                    }}
                  />
                  <Button variant="ghost" size="icon" onClick={async () => {
                    try { await callDelete({ data: { id: it.id } }); toast.success("Deleted"); refresh(); }
                    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
