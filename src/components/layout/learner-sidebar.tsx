"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  Award,
  Calendar,
  ClipboardList,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Users,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import { UserMenu } from "./user-menu"
import { NotificationBell } from "./notification-bell"

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/catalog", label: "Kurskatalog", icon: BookOpen },
  { href: "/events", label: "Termine", icon: Calendar },
  { href: "/showcase", label: "Showcase", icon: Sparkles },
  { href: "/prompts", label: "Prompts", icon: MessageSquare },
  { href: "/impact", label: "Impact-Stories", icon: TrendingUp },
  { href: "/surveys", label: "Umfragen", icon: ClipboardList },
  { href: "/certificates", label: "Meine Zertifikate", icon: Award },
]

function SidebarContent({
  onNavigate,
  hasTeam,
}: {
  onNavigate?: () => void
  hasTeam?: boolean
}) {
  const pathname = usePathname()
  const navItems = hasTeam
    ? [
        ...baseNavItems.slice(0, 1),
        { href: "/my-team", label: "Mein Team", icon: Users },
        ...baseNavItems.slice(1),
      ]
    : baseNavItems

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-6 border-b">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">INOTEC</span>
          <span className="text-sm text-muted-foreground">Lernportal</span>
        </div>
        <NotificationBell />
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <UserMenu />
    </div>
  )
}

export function LearnerSidebar({ hasTeam }: { hasTeam?: boolean }) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-card border-r shrink-0">
        <SidebarContent hasTeam={hasTeam} />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">INOTEC</span>
          <span className="text-xs text-muted-foreground">Lernportal</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Menü öffnen</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent hasTeam={hasTeam} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  )
}
