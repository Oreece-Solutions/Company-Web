import { Plus } from "lucide-react";

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="faq divide-y divide-border border-y border-border">
      {items.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-semibold">
            {f.q}
            <Plus className="h-5 w-5 shrink-0 text-[hsl(var(--brand-red))] transition-transform group-open:rotate-45" />
          </summary>
          <p className="max-w-2xl pb-6 leading-relaxed text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
