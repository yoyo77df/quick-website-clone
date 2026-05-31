import { GAMES, type GameValue } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Filter = GameValue | "all" | "online";

export function GameFilterTabs({ value, onChange }: { value: Filter; onChange: (v: Filter) => void }) {
  const tabs: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    ...GAMES.map((g) => ({ value: g.value as Filter, label: g.label })),
    { value: "online", label: "🟢 Online" },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-thin -mx-1 px-1 pb-2">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap",
            value === t.value
              ? "bg-primary text-primary-foreground border-primary glow-primary"
              : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
