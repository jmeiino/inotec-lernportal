"use client"

import { useState, useMemo } from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns"
import { de } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CalendarEvent = {
  id: string
  date: Date
  title: string
  color?: string
}

interface CalendarGridProps {
  events: CalendarEvent[]
  onDayClick?: (date: Date, dayEvents: CalendarEvent[]) => void
  onMonthChange?: (date: Date) => void
}

const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

export function CalendarGrid({ events, onDayClick, onMonthChange }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const key = format(new Date(event.date), "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(event)
    }
    return map
  }, [events])

  const handlePrev = () => {
    const newMonth = subMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleNext = () => {
    const newMonth = addMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={handlePrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold">
          {format(currentMonth, "MMMM yyyy", { locale: de })}
        </h3>
        <Button variant="ghost" size="icon" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-px">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd")
          const dayEvents = eventsByDay.get(key) || []
          const inMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)

          return (
            <button
              key={key}
              type="button"
              onClick={() => dayEvents.length > 0 && onDayClick?.(day, dayEvents)}
              className={cn(
                "min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 text-left bg-card transition-colors",
                !inMonth && "bg-muted/50 text-muted-foreground",
                dayEvents.length > 0 && "cursor-pointer hover:bg-muted",
                dayEvents.length === 0 && "cursor-default"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  today && "bg-primary text-primary-foreground font-bold"
                )}
              >
                {format(day, "d")}
              </span>
              {dayEvents.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className="h-1.5 sm:h-2 rounded-full bg-primary/70 w-full"
                      title={event.title}
                    />
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayEvents.length - 2}
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
