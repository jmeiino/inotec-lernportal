import { requireAuth } from "@/lib/auth-guard"
import { getUserCertificates } from "@/lib/actions/certificates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Award, FileDown, Calendar } from "lucide-react"
import Link from "next/link"
import { formatCompetenceLevel } from "@/lib/utils"

export default async function CertificatesPage() {
  const session = await requireAuth()
  const result = await getUserCertificates()
  const certificates = result.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meine Zertifikate</h1>
        <p className="text-muted-foreground mt-1">
          Ihre erworbenen Zertifikate und Nachweise.
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Award className="h-16 w-16 text-muted-foreground/40 mx-auto" />
            <h3 className="text-lg font-medium text-muted-foreground">
              Noch keine Zertifikate
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Schliessen Sie einen Track ab, um ein Zertifikat zu erhalten.
            </p>
            <Button asChild variant="outline">
              <Link href="/catalog">Zum Kurskatalog</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => {
            const dateStr = new Intl.DateTimeFormat("de-DE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(cert.issuedAt))

            return (
              <Card key={cert.id} className="relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Award className="h-6 w-6 text-amber-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {cert.trackName}
                        </CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {formatCompetenceLevel(cert.competenceLevel)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{dateStr}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Nr.: </span>
                      <span className="font-mono font-medium text-xs">
                        {cert.certNumber}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/api/certificates/${cert.id}/pdf`}>
                      <FileDown className="h-4 w-4 mr-2" />
                      PDF herunterladen
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
