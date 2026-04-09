import { Button } from "@/components/ui/button"
import { getPathForRoute } from "@/lib/routing"

export function PublicNavbar({ onNavigate }) {
  const handleNavigate = (event, route) => {
    if (!onNavigate) return
    event.preventDefault()
    onNavigate(route)
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded-full border border-border/70 bg-transparent px-6 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.08)] backdrop-blur-2xl">
        <div className="flex justify-start">
          <Button variant="ghost" size="sm" className="px-2 text-base font-semibold text-foreground hover:bg-accent/40 hover:text-foreground" asChild>
            <a href={getPathForRoute("landing")} onClick={(event) => handleNavigate(event, "landing")}>
              Tribunal
            </a>
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" className="rounded-full px-3 text-muted-foreground hover:bg-accent/40 hover:text-foreground" asChild>
            <a href={getPathForRoute("landing")} onClick={(event) => handleNavigate(event, "landing")}>
              Home
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full px-3 text-muted-foreground hover:bg-accent/40 hover:text-foreground" asChild>
            <a href={getPathForRoute("login")} onClick={(event) => handleNavigate(event, "login")}>
              Login
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full px-3 text-muted-foreground hover:bg-accent/40 hover:text-foreground" asChild>
            <a href={getPathForRoute("signup")} onClick={(event) => handleNavigate(event, "signup")}>
              Signup
            </a>
          </Button>
        </div>

        <div />
      </div>
    </div>
  )
}
