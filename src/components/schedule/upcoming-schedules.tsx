import { format } from "date-fns"
import { de } from "date-fns/locale"
import Link from "next/link"
import { Calendar, Clock, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getUpcomingUserSchedules } from "@/lib/actions/schedules"

interface UpcomingSchedulesProps {
  userId: string
}

export async function UpcomingSchedules({ userId }: UpcomingSchedulesProps) {
  const schedules = await getUpcomingUserSchedules(userId, 3)

  if (schedules.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Kommende Praesenztermine
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <Link
              key={schedule.id}
              href={`/modules/${schedule.moduleId}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{schedule.moduleCode}</Badge>
                  <span className="font-medium text-sm">
                    {schedule.moduleTitle}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {schedule.location}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(schedule.startTime), "dd. MMM yyyy, HH:mm", {
                    locale: de,
                  })}{" "}
                  -{" "}
                  {format(new Date(schedule.endTime), "HH:mm", { locale: de })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
