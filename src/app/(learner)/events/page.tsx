import { requireAuth } from "@/lib/auth-guard"
import { listEvents } from "@/lib/actions/events"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatEventType } from "@/lib/utils"
import { Clock, MapPin, Users, User } from "lucide-react"
import type { EventType } from "@prisma/client"

const EVENT_TYPES: EventType[] = [
  "KURS",
  "STAMMTISCH",
  "SHOWCASE",
  "STRATEGIC_REVIEW",
  "L3_COMMUNITY",
]

export default async function EventsPage() {
  await requireAuth()
  const events = await listEvents({ upcoming: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Termine & Austauschformate</h1>
        <p className="text-muted-foreground mt-1">
          Kurse, Stammtische, Showcases und strategische Reviews an einem Ort.
        </p>
      </div>

      <Tabs defaultValue="ALL">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="ALL">Alle</TabsTrigger>
          {EVENT_TYPES.map((t) => (
            <TabsTrigger key={t} value={t}>
              {formatEventType(t)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ALL" className="mt-4">
          <EventList items={events} />
        </TabsContent>
        {EVENT_TYPES.map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            <EventList items={events.filter((e) => e.eventType === t)} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function EventList({ items }: { items: Awaited<ReturnType<typeof listEvents>> }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Keine anstehenden Termine in dieser Kategorie.
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((e) => (
        <Card key={e.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">
                {e.title ?? e.module?.title ?? formatEventType(e.eventType)}
              </CardTitle>
              <Badge variant="outline">{formatEventType(e.eventType)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {e.description && (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {e.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {new Date(e.startTime).toLocaleString("de-DE")} –
              {" "}
              {new Date(e.endTime).toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {e.location}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              {e.trainerName}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              {e.registeredCount}/{e.maxParticipants}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
