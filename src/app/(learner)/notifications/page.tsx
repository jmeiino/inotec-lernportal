import { requireAuth } from "@/lib/auth-guard"
import { listMyNotifications } from "@/lib/actions/notifications"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default async function NotificationsPage() {
  await requireAuth()
  const items = await listMyNotifications(200)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Benachrichtigungen</h1>
        <p className="text-muted-foreground mt-1">
          Alle Ereignisse zu Ihren Arbeitsprodukten, Umfragen und Terminen.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Benachrichtigungen.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={n.read ? "" : "border-primary/40"}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium text-sm">{n.title}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {!n.read && (
                      <Badge variant="secondary" className="text-[10px]">
                        neu
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("de-DE")}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {n.bodyMd}
                </p>
                {n.linkUrl && (
                  <Link
                    href={n.linkUrl}
                    className="text-xs text-primary hover:underline"
                  >
                    Oeffnen →
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
