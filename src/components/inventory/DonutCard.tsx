import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PALETTE = [
  "var(--color-primary)",
  "var(--color-accent)",
  "var(--color-warning)",
  "var(--color-destructive)",
  "var(--color-chart-5)",
];

export type Slice = { name: string; value: number };

export function DonutCard({ title, data }: { title: string; data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>

      {total === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Sem dados</p>
      ) : (
        <>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.8rem",
                    color: "var(--color-card-foreground)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-3 space-y-1.5">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  {d.name}
                </span>
                <span className="tabular-nums font-medium text-foreground">
                  {d.value}{" "}
                  <span className="text-muted-foreground">
                    ({Math.round((d.value / total) * 100)}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
