import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="shadow-none">
      <CardContent className="px-5 py-5">
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
          {label}
        </div>
        <div className="text-3xl font-mono font-medium tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
