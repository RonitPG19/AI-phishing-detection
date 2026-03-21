import { navItems } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

export function BottomNav({ activePage, onChange }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[11px]",
              activePage === item.id ? "text-foreground" : "text-muted-foreground"
            )}
            aria-label={item.label}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
