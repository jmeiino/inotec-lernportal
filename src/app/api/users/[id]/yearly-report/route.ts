import { NextResponse } from "next/server"
import { exportYearlyReportCsv } from "@/lib/actions/import-export"

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const csv = await exportYearlyReportCsv(params.id)
    if (!csv) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
    }
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jahresbericht-${params.id}.csv"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    )
  }
}
