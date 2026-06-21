"use client"

import { Bell, Search, Moon, Sun, Sunset, Snowflake, PanelLeft, PanelRight } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/lib/i18n/context"

export function AppHeader() {
  const { theme, setTheme } = useTheme()
  const { dir } = useTranslation()
  const { toggleSidebar } = useSidebar()

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("sunset")
    } else if (theme === "sunset") {
      setTheme("frost")
    } else if (theme === "frost") {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Button variant="ghost" size="icon" className="size-7" onClick={toggleSidebar}>
        {dir === 'rtl' ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
      </Button>

      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search projects, units, tickets..." className="w-full pl-9" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={cycleTheme} className="relative">
          <Sun className={`h-5 w-5 transition-all ${theme === "light" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`} />
          <Sunset className={`absolute h-5 w-5 transition-all ${theme === "sunset" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`} />
          <Snowflake className={`absolute h-5 w-5 transition-all ${theme === "frost" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`} />
          <Moon className={`absolute h-5 w-5 transition-all ${theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`} />
          <span className="sr-only">Toggle theme (Light → Sunset → Frost → Dark)</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs">
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-2">
              <h3 className="mb-2 text-sm font-semibold">Notifications</h3>
              <DropdownMenuItem className="flex flex-col items-start gap-1">
                <span className="font-medium">Emergency Ticket #1847</span>
                <span className="text-xs text-muted-foreground">High priority elevator breakdown at Site A</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1">
                <span className="font-medium">Maintenance Due</span>
                <span className="text-xs text-muted-foreground">5 units require scheduled maintenance this week</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1">
                <span className="font-medium">Low Stock Alert</span>
                <span className="text-xs text-muted-foreground">Motor parts inventory below threshold</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
