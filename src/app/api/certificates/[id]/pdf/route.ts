import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { CertificatePDF } from "@/lib/certificate-pdf"
import React from "react"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert." },
        { status: 401 }
      )
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true } },
        track: { select: { name: true } },
      },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: "Zertifikat nicht gefunden." },
        { status: 404 }
      )
    }

    // Only allow the certificate owner or an admin to download
    if (
      certificate.user.id !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Zugriff verweigert." },
        { status: 403 }
      )
    }

    const element = React.createElement(CertificatePDF, {
      participantName: certificate.user.name,
      trackName: certificate.track.name,
      certNumber: certificate.certNumber,
      issuedAt: certificate.issuedAt,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any)

    return new NextResponse(Buffer.from(pdfBuffer) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Zertifikat-${certificate.certNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating certificate PDF:", error)
    return NextResponse.json(
      { error: "Fehler beim Generieren des PDF." },
      { status: 500 }
    )
  }
}
