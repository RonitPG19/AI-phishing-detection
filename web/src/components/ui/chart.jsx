import * as React from "react"
import {
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

const ChartContainer = React.forwardRef(
  ({ config, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={className}
        style={{
          "--color-desktop": config.desktop?.color,
          "--color-mobile": config.mobile?.color,
          ...props.style,
        }}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = Tooltip
const ChartTooltipContent = ({ active, payload, label, hideLabel, indicator, labelFormatter }) => {
  if (!active || !payload) return null

  return (
    <div className="rounded-xl border border-border bg-popover p-2 shadow-xl backdrop-blur-md">
      {!hideLabel && (
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => (
            <span className="text-[11px] font-medium text-popover-foreground">
              {item.name}: <span className="font-bold">{item.value}</span>
            </span>
        ))}
      </div>
    </div>
  )
}

const ChartLegend = Legend
const ChartLegendContent = ({ payload }) => {
  if (!payload) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
      {payload.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
}
