import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { logToolUsage } from "@/lib/actions/tools"
import { Tool } from "@prisma/client"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const payload = body as {
    tool?: string
    promptHash?: string | null
    tokensIn?: number | null
    tokensOut?: number | null
    metadata?: Record<string, unknown> | null
  }

  const tool = payload.tool as Tool
  if (!tool || !(tool in Tool)) {
    return NextResponse.json(
      { error: "Invalid tool. Use CHATGPT, CLAUDE or OPENWEBUI." },
      { status: 400 }
    )
  }

  const result = await logToolUsage({
    tool,
    promptHash: payload.promptHash ?? null,
    tokensIn:
      typeof payload.tokensIn === "number" ? payload.tokensIn : null,
    tokensOut:
      typeof payload.tokensOut === "number" ? payload.tokensOut : null,
    metadata: payload.metadata ?? null,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 403 })
  }
  return NextResponse.json({ success: true })
}
