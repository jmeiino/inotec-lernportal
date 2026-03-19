"use client"

import { useState, useEffect, useTransition } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Calendar, MapPin, User, Users, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getModuleSchedules,
  registerForSchedule,
  unregisterFromSchedule,
  type ScheduleWithDetails,
} from "@/lib/actions/schedules"

interface ScheduleListProps {
  moduleId: string
}

export function ScheduleList({ moduleId }: ScheduleListProps) {
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const loadSchedules = async () => {
    const data = await getModuleSchedules(moduleId)
    // Only show future schedules
    const now = new Date()
    setSchedules(data.filter((s) => new Date(s.startTime) > now))
    setIsLoading(false)
  }

  useEffect(() => {
    loadSchedules()
  }, [moduleId])

  const handleRegister = (scheduleId: string) => {
    startTransition(async () => {
      const result = await registerForSchedule(scheduleId)
      if (result.success) {
        await loadSchedules()
      }
    })
  }

  const handleUnregister = (scheduleId: string) => {
    startTransition(async () => {
      const result = await unregisterFromSchedule(scheduleId)
      if (result.success) {
        await loadSchedules()
      }
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Praesenztermine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Termine werden geladen...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (schedules.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Praesenztermine
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const spotsLeft = schedule.maxParticipants - schedule.registrationCount
            const isFull = spotsLeft <= 0

            return (
              <div
                key={schedule.id}
                className="p-4 rounded-lg border bg-muted/30 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">
                      {format(new Date(schedule.startTime), "EEEE, d. MMMM yyyy", {
                        locale: de,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(schedule.startTime), "HH:mm", { locale: de })}
                      {" - "}
                      {format(new Date(schedule.endTime), "HH:mm", { locale: de })} Uhr
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {schedule.isRegistered ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnregister(schedule.id)}
                        disabled={isPending}
                      >
                        Abmelden
                      </Button>
                    ) : isFull ? (
                      <Badge variant="destructive">Ausgebucht</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleRegister(schedule.id)}
                        disabled={isPending}
                      >
                        Anmelden
                      </Button>
                    )}
                    <a
                      href={`/api/schedules/${schedule.id}/ical`}
                      download
                      title="Kalender-Datei herunterladen"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {schedule.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {schedule.trainerName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {schedule.registrationCount}/{schedule.maxParticipants} Plaetze belegt
                  </span>
                </div>

                {schedule.isRegistered && (
                  <Badge variant="success" className="text-xs">
                    Sie sind angemeldet
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
