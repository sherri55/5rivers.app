import { useLocation, Link } from "react-router-dom"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth"

const pathTitles: Record<string, string> = {
  "/": "Dashboard",
  "/jobs": "Jobs Hub",
  "/fleet": "Fleet Index",
  "/invoices": "Invoices",
  "/reports": "Analytics",
  "/companies": "Companies",
  "/dispatchers": "Dispatchers",
  "/job-types": "Job Types",
  "/drivers": "Drivers",
  "/units": "Units",
}

export function CommandNavbar({
  onMenuClick,
  onAssistantClick,
}: {
  onMenuClick: () => void
  onAssistantClick?: () => void
}) {
  const location = useLocation()
  const { logout } = useAuth()

  const getTitle = () => {
    for (const [path, title] of Object.entries(pathTitles)) {
      if (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)) {
        return title
      }
    }
    return "Command Center"
  }

  return (
    <header className="h-16 bg-navy-light border-b border-slate-800 px-4 md:px-8 flex items-center justify-between shrink-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-800 rounded-lg"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary border border-primary/30">
            <span className="material-symbols-outlined text-lg">local_shipping</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">{getTitle()}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onAssistantClick && (
          <>
            <button
              onClick={onAssistantClick}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full hover:bg-primary/20 transition-all"
            >
              <span className="material-symbols-outlined text-sm">smart_toy</span>
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                AI Assistant
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </button>
            <div className="h-8 w-px bg-slate-700 mx-1" />
          </>
        )}

        <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-slate-300 hover:text-white hover:bg-slate-800">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  )
}
