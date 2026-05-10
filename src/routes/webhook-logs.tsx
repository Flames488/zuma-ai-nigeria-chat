import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuthedServerFn } from "@/lib/authed-fn";
import { getWebhookLogs, type WebhookLogRow } from "@/lib/server/webhook-logs.functions";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/webhook-logs")({
  head: () => ({
    meta: [
      { title: "Webhook Logs — Wabizz" },
      { name: "description", content: "Recent inbound WhatsApp messages, AI responses, and send status." },
    ],
  }),
  component: WebhookLogsPage,
});

function statusBadge(status: string) {
  if (status === "sent") return { Icon: CheckCircle2, cls: "bg-success/15 text-success border-success/30", label: "Sent" };
  if (status === "send_failed") return { Icon: XCircle, cls: "bg-destructive/15 text-destructive border-destructive/30", label: "Send failed" };
  if (status === "no_reply") return { Icon: Clock, cls: "bg-muted text-muted-foreground border-border", label: "No reply" };
  if (status === "no_business_match") return { Icon: AlertTriangle, cls: "bg-warning/15 text-warning-foreground border-warning/30", label: "No business match" };
  if (status === "business_missing") return { Icon: AlertTriangle, cls: "bg-warning/15 text-warning-foreground border-warning/30", label: "Business missing" };
  return { Icon: Clock, cls: "bg-muted text-muted-foreground border-border", label: status };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function WebhookLogsPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useRequireAuth();
  const callLogs = useAuthedServerFn(getWebhookLogs);
  const [logs, setLogs] = useState<WebhookLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await callLogs();
      setLogs(res.logs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <header className="bg-card border-b border-border/60 sticky top-0 z-10 backdrop-blur-md bg-card/90">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/dashboard"
              className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted transition-smooth"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Debug</p>
              <h1 className="text-lg font-bold tracking-tight truncate">Webhook Logs</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <button
              onClick={signOut}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-6 space-y-4 animate-fade-in">
        <div className="px-1">
          <p className="text-sm text-muted-foreground">
            Latest 100 inbound WhatsApp webhook events for your business — useful for debugging
            delivery, AI responses, and send status.
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-10 text-center text-sm text-muted-foreground">
            No webhook events yet. Once Twilio posts to{" "}
            <code className="text-xs">/api/public/twilio-webhook</code>, events will appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((l) => {
              const b = statusBadge(l.send_status);
              return (
                <div key={l.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{l.from_number}</span>
                      <span>→</span>
                      <span className="font-mono">{l.to_number}</span>
                      <span className="opacity-60">·</span>
                      <span>{l.business_name ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${b.cls}`}>
                        <b.Icon className="h-3 w-3" />
                        {b.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(l.created_at)}</span>
                    </div>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Inbound</p>
                      <div className="text-sm bg-muted/50 rounded-lg px-3 py-2 whitespace-pre-line break-words">
                        {l.inbound_message || "—"}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">AI Response</p>
                      <div className="text-sm bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 whitespace-pre-line break-words">
                        {l.ai_response || <span className="text-muted-foreground italic">No reply generated</span>}
                      </div>
                    </div>
                  </div>

                  {l.error && (
                    <div className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 break-words">
                      <span className="font-semibold">Error:</span> {l.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
