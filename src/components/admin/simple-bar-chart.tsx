interface BarItem {
  label: string
  value: number
  maxValue?: number
  color?: string
}

interface SimpleBarChartProps {
  items: BarItem[]
  title: string
  valueLabel?: string
}

export function SimpleBarChart({ items, title, valueLabel = "%" }: SimpleBarChartProps) {
  const maxValue = Math.max(...items.map((i) => i.maxValue ?? i.value), 1)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Keine Daten vorhanden</p>
      )}
      {items.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate mr-2">{item.label}</span>
            <span className="text-muted-foreground whitespace-nowrap">
              {item.value}{valueLabel}
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((item.value / maxValue) * 100, 100)}%`,
                backgroundColor: item.color ?? "hsl(var(--primary))",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
