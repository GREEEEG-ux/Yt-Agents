import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          {label}
        </div>
        <div className="text-2xl font-semibold font-mono">{value}</div>
      </CardContent>
    </Card>
  );
}
