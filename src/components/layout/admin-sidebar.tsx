"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  Calendar,
  Grid3x3,
  MessageSquare,
  ArrowLeft,
  Menu,
} from "lucide-react"
import type { Role } from "@prisma/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import { UserMenu } from "./user-menu"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  allowed: Role[]
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, allowed: ["ADMIN", "TRAINER"] },
  { href: "/admin/users", label: "Nutzerverwaltung", icon: Users, allowed: ["ADMIN", "TRAINER"] },
  { href: "/admin/courses", label: "Kurs-Editor", icon: BookOpen, allowed: ["ADMIN", "TRAINER"] },
  { href: "/admin/quizzes", label: "Quiz-Editor", icon: ClipboardList, allowed: ["ADMIN", "TRAINER"] },
  { href: "/admin/review", label: "Review-Queue", icon: ClipboardCheck, allowed: ["ADMIN", "TRAINER", "MULTIPLICATOR", "CHAMPION"] },
  { href: "/admin/surveys", label: "Umfragen", icon: MessageSquare, allowed: ["ADMIN"] },
  { href: "/admin/heatmap", label: "Heatmap", icon: Grid3x3, allowed: ["ADMIN", "TRAINER", "MULTIPLICATOR", "CHAMPION"] },
  { href: "/admin/calendar", label: "Kalender", icon: Calendar, allowed: ["ADMIN", "TRAINER"] },
]

function SidebarContent({
  onNavigate,
  role,
}: {
  onNavigate?: () => void
  role: Role
}) {
  const pathname = usePathname()
  const visibleItems = navItems.filter((i) => i.allowed.includes(role))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-6 border-b">
        <span className="text-xl font-bold text-primary">INOTEC</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
          Admin
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(item.href + "/")
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
        <div className="pt-4 border-t mt-4">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Zum Lernportal
          </Link>
        </div>
      </nav>

      <UserMenu />
    </div>
  )
}

export function AdminSidebar({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-card border-r shrink-0">
        <SidebarContent role={role} />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">INOTEC</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            Admin
          </span>
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
            <SidebarContent role={role} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  )
}
