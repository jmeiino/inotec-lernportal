import { requireTrainer } from "@/lib/auth-guard"
import { CalendarClient } from "./calendar-client"

export default async function CalendarPage() {
  await requireTrainer()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kalender</h1>
        <p className="text-muted-foreground mt-1">
          Praesenzschulungen planen und Termine verwalten.
        </p>
      </div>

      <CalendarClient />
    </div>
  )
}
