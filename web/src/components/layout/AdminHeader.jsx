import { Bell, Download, Moon, Search, SlidersHorizontal, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

export function AdminHeader({ theme, onThemeToggle }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="px-4 py-3 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <InputGroup className="w-full md:w-72">
            <InputGroupAddon>
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search" />
          </InputGroup>

          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap md:justify-end">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 md:h-8 md:w-auto md:px-2.5">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="sr-only md:not-sr-only">Filters</span>
              </Button>
              <Button size="sm" className="h-9 w-9 p-0 md:h-8 md:w-auto md:px-2.5">
                <Download className="h-4 w-4" />
                <span className="sr-only md:not-sr-only">Export</span>
              </Button>
            </div>

            <div className="ml-auto flex items-center gap-1 md:ml-0">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={onThemeToggle}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" type="button" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
