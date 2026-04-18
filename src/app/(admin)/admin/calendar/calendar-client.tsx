"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import {
  Calendar as CalendarIcon,
  List,
  Plus,
  Pencil,
  Trash2,
  Users,
  Download,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CalendarGrid, type CalendarEvent } from "@/components/schedule/calendar-grid"
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getScheduleParticipants,
  getAllModulesForSelect,
  getTrainersForSelect,
  type ScheduleWithDetails,
} from "@/lib/actions/schedules"

type ViewMode = "calendar" | "list"

interface ModuleOption {
  id: string
  title: string
  code: string
}

interface TrainerOption {
  id: string
  name: string
}

interface ParticipantInfo {
  id: string
  registeredAt: Date
  user: { id: string; name: string; email: string; department: string | null }
}

export function CalendarClient() {
  const [viewMode, setViewMode] = useState<ViewMode>("calendar")
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([])
  const [modules, setModules] = useState<ModuleOption[]>([])
  const [trainers, setTrainers] = useState<TrainerOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithDetails | null>(null)
  const [showParticipantsDialog, setShowParticipantsDialog] = useState(false)
  const [participants, setParticipants] = useState<ParticipantInfo[]>([])
  const [participantSchedule, setParticipantSchedule] = useState<ScheduleWithDetails | null>(null)
  const [showDayEventsDialog, setShowDayEventsDialog] = useState(false)
  const [dayEventsDate, setDayEventsDate] = useState<Date | null>(null)
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([])

  // Form state
  const [formModuleId, setFormModuleId] = useState("")
  const [formLocation, setFormLocation] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formStartTime, setFormStartTime] = useState("")
  const [formEndTime, setFormEndTime] = useState("")
  const [formMaxParticipants, setFormMaxParticipants] = useState("20")
  const [formTrainerId, setFormTrainerId] = useState("")

  const loadData = useCallback(async () => {
    const [schedulesData, modulesData, trainersData] = await Promise.all([
      getSchedules(),
      getAllModulesForSelect(),
      getTrainersForSelect(),
    ])
    setSchedules(schedulesData)
    setModules(modulesData)
    setTrainers(trainersData)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setFormModuleId("")
    setFormLocation("")
    setFormDate("")
    setFormStartTime("")
    setFormEndTime("")
    setFormMaxParticipants("20")
    setFormTrainerId("")
  }

  const openCreateDialog = () => {
    resetForm()
    setEditingSchedule(null)
    setShowCreateDialog(true)
  }

  const openEditDialog = (schedule: ScheduleWithDetails) => {
    setEditingSchedule(schedule)
    setFormModuleId(schedule.moduleId ?? "")
    setFormLocation(schedule.location)
    setFormDate(format(new Date(schedule.startTime), "yyyy-MM-dd"))
    setFormStartTime(format(new Date(schedule.startTime), "HH:mm"))
    setFormEndTime(format(new Date(schedule.endTime), "HH:mm"))
    setFormMaxParticipants(String(schedule.maxParticipants))
    setFormTrainerId(schedule.trainerId)
    setShowCreateDialog(true)
  }

  const handleSave = () => {
    if (!formModuleId || !formLocation || !formDate || !formStartTime || !formEndTime || !formTrainerId) {
      return
    }

    const startTime = `${formDate}T${formStartTime}:00`
    const endTime = `${formDate}T${formEndTime}:00`

    startTransition(async () => {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, {
          moduleId: formModuleId,
          location: formLocation,
          startTime,
          endTime,
          maxParticipants: parseInt(formMaxParticipants),
          trainerId: formTrainerId,
        })
      } else {
        await createSchedule({
          moduleId: formModuleId,
          location: formLocation,
          startTime,
          endTime,
          maxParticipants: parseInt(formMaxParticipants),
          trainerId: formTrainerId,
        })
      }
      setShowCreateDialog(false)
      resetForm()
      await loadData()
    })
  }

  const handleDelete = (scheduleId: string) => {
    if (!confirm("Termin wirklich loeschen?")) return
    startTransition(async () => {
      await deleteSchedule(scheduleId)
      await loadData()
    })
  }

  const handleViewParticipants = (schedule: ScheduleWithDetails) => {
    setParticipantSchedule(schedule)
    startTransition(async () => {
      const data = await getScheduleParticipants(schedule.id)
      setParticipants(data)
      setShowParticipantsDialog(true)
    })
  }

  const handleDayClick = (date: Date, events: CalendarEvent[]) => {
    setDayEventsDate(date)
    setDayEvents(events)
    setShowDayEventsDialog(true)
  }

  const calendarEvents: CalendarEvent[] = schedules.map((s) => ({
    id: s.id,
    date: new Date(s.startTime),
    title: `${s.moduleCode} - ${s.moduleTitle}`,
  }))

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Kalender wird geladen...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            Kalender
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4 mr-1" />
            Liste
          </Button>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1" />
          Neuer Termin
        </Button>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <CalendarGrid events={calendarEvents} onDayClick={handleDayClick} />
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Modul</TableHead>
                    <TableHead className="hidden md:table-cell">Ort</TableHead>
                    <TableHead className="hidden md:table-cell">Trainer</TableHead>
                    <TableHead>Teilnehmer</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Noch keine Termine vorhanden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="whitespace-nowrap">
                          <div>
                            <p className="font-medium text-sm">
                              {format(new Date(schedule.startTime), "dd.MM.yyyy", { locale: de })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(schedule.startTime), "HH:mm", { locale: de })}
                              {" - "}
                              {format(new Date(schedule.endTime), "HH:mm", { locale: de })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {schedule.moduleCode}
                            </Badge>
                            <span className="text-sm truncate max-w-[120px] hidden lg:inline">
                              {schedule.moduleTitle}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {schedule.location}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {schedule.trainerName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              schedule.registrationCount >= schedule.maxParticipants
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {schedule.registrationCount}/{schedule.maxParticipants}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewParticipants(schedule)}
                              title="Teilnehmer anzeigen"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(schedule)}
                              title="Bearbeiten"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <a href={`/api/schedules/${schedule.id}/ical`} download>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="iCal herunterladen"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(schedule.id)}
                              disabled={isPending}
                              title="Loeschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Termin bearbeiten" : "Neuer Termin"}
            </DialogTitle>
            <DialogDescription>
              {editingSchedule
                ? "Bearbeiten Sie die Termindetails."
                : "Erstellen Sie einen neuen Praesenztermin."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Modul</Label>
              <Select value={formModuleId} onValueChange={setFormModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Modul waehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code} - {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ort</Label>
              <Input
                placeholder="z.B. Schulungsraum 1"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startzeit</Label>
                <Input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Endzeit</Label>
                <Input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max. Teilnehmer</Label>
              <Input
                type="number"
                min={1}
                value={formMaxParticipants}
                onChange={(e) => setFormMaxParticipants(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Trainer</Label>
              <Select value={formTrainerId} onValueChange={setFormTrainerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Trainer waehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {trainers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Wird gespeichert..." : editingSchedule ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      <Dialog open={showParticipantsDialog} onOpenChange={setShowParticipantsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Teilnehmer</DialogTitle>
            <DialogDescription>
              {participantSchedule &&
                `${participantSchedule.moduleCode} - ${format(
                  new Date(participantSchedule.startTime),
                  "dd.MM.yyyy",
                  { locale: de }
                )}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Noch keine Anmeldungen.
              </p>
            ) : (
              participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{p.user.name}</p>
                    <p className="text-xs text-muted-foreground">{p.user.email}</p>
                  </div>
                  {p.user.department && (
                    <Badge variant="outline" className="text-xs">
                      {p.user.department}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Day Events Dialog */}
      <Dialog open={showDayEventsDialog} onOpenChange={setShowDayEventsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dayEventsDate &&
                format(dayEventsDate, "EEEE, d. MMMM yyyy", { locale: de })}
            </DialogTitle>
            <DialogDescription>
              Termine an diesem Tag
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {dayEvents.map((event) => {
              const schedule = schedules.find((s) => s.id === event.id)
              if (!schedule) return null
              return (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{schedule.moduleCode}</Badge>
                    <span className="text-sm font-medium">{schedule.moduleTitle}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(schedule.startTime), "HH:mm", { locale: de })}
                    {" - "}
                    {format(new Date(schedule.endTime), "HH:mm", { locale: de })} Uhr
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {schedule.location} &middot; {schedule.trainerName}
                  </p>
                  <Badge
                    variant={
                      schedule.registrationCount >= schedule.maxParticipants
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {schedule.registrationCount}/{schedule.maxParticipants} Teilnehmer
                  </Badge>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
