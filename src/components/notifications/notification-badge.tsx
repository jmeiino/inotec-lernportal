"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { getUnresolvedCommentCount } from "@/lib/actions/comments"

interface NotificationBadgeProps {
  userId: string
  userRole: string
}

export function NotificationBadge({ userId, userRole }: NotificationBadgeProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (userRole !== "TRAINER" && userRole !== "ADMIN") return

    const fetchCount = async () => {
      const c = await getUnresolvedCommentCount(userId)
      setCount(c)
    }

    fetchCount()

    // Refresh every 60 seconds
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [userId, userRole])

  if (userRole !== "TRAINER" && userRole !== "ADMIN") return null

  return (
    <div className="relative inline-flex items-center justify-center">
      <Bell className="h-5 w-5 text-muted-foreground" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </div>
  )
}
