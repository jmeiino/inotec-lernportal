"use client"

import { useSession, signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

const roleLabels: Record<string, string> = {
  LEARNER: "Lernende/r",
  TRAINER: "Trainer/in",
  ADMIN: "Administrator/in",
}

export function UserMenu() {
  const { data: session } = useSession()

  if (!session?.user) return null

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  return (
    <div className="p-4 border-t">
      <div className="flex items-center gap-3 px-3 py-2">
        <Avatar className="h-9 w-9">
          {session.user.image && (
            <AvatarImage src={session.user.image} alt={session.user.name || ""} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{session.user.name}</p>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {roleLabels[session.user.role] || session.user.role}
          </Badge>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-3 px-3 mt-1 text-muted-foreground"
        onClick={() => signOut({ callbackUrl: "/auth/login" })}
      >
        <LogOut className="h-4 w-4" />
        Abmelden
      </Button>
    </div>
  )
}
