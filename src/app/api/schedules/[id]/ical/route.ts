import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"

function formatICalDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss")
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: params.id },
      include: {
        module: { select: { title: true, code: true } },
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
    }

    const summary = escapeICalText(
      `${schedule.module.code} - ${schedule.module.title}`
    )
    const location = escapeICalText(schedule.location)
    const description = escapeICalText(
      `Praesenztermin fuer Modul ${schedule.module.code}`
    )

    const ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//INOTEC//Lernportal//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${schedule.id}@inotec-lernportal`,
      `DTSTART:${formatICalDate(schedule.startTime)}`,
      `DTEND:${formatICalDate(schedule.endTime)}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      `DTSTAMP:${formatICalDate(new Date())}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n")

    return new NextResponse(ical, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${schedule.module.code}-${format(
          schedule.startTime,
          "yyyy-MM-dd"
        )}.ics"`,
      },
    })
  } catch (error) {
    console.error("Error generating iCal:", error)
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    )
  }
}
