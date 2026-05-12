import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, UtensilsCrossed, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/dashboard/niche")({
  head: () => ({
    meta: [
      { title: "Niche modules — Wabizz" },
      { name: "description", content: "Activate vertical-specific automation: hospitals, food traders, and more." },
    ],
  }),
  component: NicheIndex,
});

function NicheIndex() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Niche modules</h1>
        <p className="mt-2 text-muted-foreground">Turn on vertical-specific automation that runs inside your existing WhatsApp pipeline.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <NicheCard
            to="/dashboard/niche/hospital"
            icon={<Stethoscope className="h-6 w-6 text-primary" />}
            title="Hospital"
            description="Patients can book, check, and cancel appointments from WhatsApp via the Vitar booking system."
          />
          <NicheCard
            to="/dashboard/niche/food"
            icon={<UtensilsCrossed className="h-6 w-6 text-primary" />}
            title="Food trader"
            description="Customers browse your menu, place orders, and pay — all inside WhatsApp."
          />
        </div>
      </div>
    </div>
  );
}

function NicheCard(props: { to: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link
      to={props.to}
      className="group rounded-xl border bg-card p-5 transition hover:border-primary hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">{props.icon}</div>
        <div className="text-lg font-semibold group-hover:text-primary">{props.title}</div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{props.description}</p>
    </Link>
  );
}
