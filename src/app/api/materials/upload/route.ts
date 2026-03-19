import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import type { MaterialType } from "@prisma/client"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const title = formData.get("title") as string | null
    const type = formData.get("type") as string | null
    const moduleId = formData.get("moduleId") as string | null

    if (!file || !title || !moduleId) {
      return NextResponse.json(
        { error: "Datei, Titel und Modul-ID sind erforderlich." },
        { status: 400 }
      )
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), "uploads", "materials")
    await mkdir(uploadDir, { recursive: true })

    // Generate unique filename
    const ext = path.extname(file.name)
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    const filePath = path.join(uploadDir, fileName)

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Get max sort order
    const maxOrder = await prisma.material.aggregate({
      where: { moduleId },
      _max: { sortOrder: true },
    })

    // Create database entry
    const material = await prisma.material.create({
      data: {
        moduleId,
        title,
        type: (type as MaterialType) || "OTHER",
        filePath: `uploads/materials/${fileName}`,
        fileSize: buffer.length,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    })

    return NextResponse.json({ id: material.id })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Upload fehlgeschlagen." },
      { status: 500 }
    )
  }
}
