import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuthedServerFn } from "@/lib/authed-fn";
import { listMyFoodOrders, setFoodOrderStatus } from "@/lib/server/niche.functions";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/niche/food/orders")({
  head: () => ({ meta: [{ title: "Food orders — Wabizz" }] }),
  component: OrdersPage,
});

type Order = {
  id: string;
  customer_number: string;
  customer_name: string | null;
  items: Array<{ name: string; qty: number; line_total_kobo: number }>;
  total_kobo: number;
  status: string;
  created_at: string;
};

const STATUSES = ["pending", "paid", "preparing", "out_for_delivery", "delivered", "cancelled"] as const;

function OrdersPage() {
  useRequireAuth();
  const callList = useAuthedServerFn(listMyFoodOrders);
  const callSet = useAuthedServerFn(setFoodOrderStatus);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try { setOrders((await callList({})) as unknown as Order[]); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Load failed"); }
    finally { setLoading(false); }
  }, [callList]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Link to="/dashboard/niche/food" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Food module
        </Link>
        <h1 className="text-3xl font-bold">Recent orders</h1>

        <div className="mt-6 rounded-xl border bg-card">
          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No orders yet.</div>
          ) : (
            <ul className="divide-y">
              {orders.map((o) => (
                <li key={o.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <div className="font-medium">#{o.id.slice(0, 8)} · {o.customer_name || o.customer_number}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      ₦{(o.total_kobo / 100).toLocaleString("en-NG")} · {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Select
                    value={o.status}
                    onValueChange={async (v) => {
                      try { await callSet({ data: { id: o.id, status: v as typeof STATUSES[number] } }); refresh(); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
                    }}
                  >
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (<SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
