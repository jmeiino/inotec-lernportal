"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCheck } from "lucide-react"
import {
  listMyNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications"

type Item = Awaited<ReturnType<typeof listMyNotifications>>[number]

export function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function refresh() {
    const [c, list] = await Promise.all([
      getUnreadNotificationCount(),
      listMyNotifications(10),
    ])
    setUnread(c)
    setItems(list)
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    if (open) void refresh()
  }, [open])

  function handleRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id)
      await refresh()
    })
  }

  function handleReadAll() {
    startTransition(async () => {
      await markAllNotificationsRead()
      await refresh()
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          <span className="sr-only">Benachrichtigungen</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="text-sm font-semibold">
            Benachrichtigungen
            {unread > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unread}
              </Badge>
            )}
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={handleReadAll}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Alle gelesen
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              Keine Benachrichtigungen.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`p-3 space-y-1 ${n.read ? "" : "bg-primary/5"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    {!n.read && (
                      <button
                        type="button"
                        className="text-[10px] text-muted-foreground hover:underline"
                        disabled={isPending}
                        onClick={() => handleRead(n.id)}
                      >
                        gelesen
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {n.bodyMd}
                  </p>
                  {n.linkUrl && (
                    <Link
                      href={n.linkUrl}
                      onClick={() => setOpen(false)}
                      className="text-xs text-primary hover:underline"
                    >
                      Oeffnen
                    </Link>
                  )}
                  <span className="block text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("de-DE")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-2 text-center">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs text-primary hover:underline"
          >
            Alle anzeigen
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
