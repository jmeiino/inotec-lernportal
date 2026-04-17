"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  createSubmission,
  updateSubmission,
} from "@/lib/actions/submissions"
import { toast } from "@/hooks/use-toast"
import {
  formatSubmissionStatus,
  submissionStatusVariant,
} from "@/lib/utils"
import { ClipboardCheck, Plus, Pencil, ExternalLink } from "lucide-react"
import type { SubmissionStatus } from "@prisma/client"

type Submission = {
  id: string
  title: string
  descriptionMd: string
  externalUrl: string | null
  status: SubmissionStatus
  reviewerName: string | null
  reviewNotes: string | null
  submittedAt: string
  reviewedAt: string | null
}

interface SubmissionSectionProps {
  moduleId: string
  required: boolean
  initialSubmissions: Submission[]
}

export function SubmissionSection({
  moduleId,
  required,
  initialSubmissions,
}: SubmissionSectionProps) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [descriptionMd, setDescriptionMd] = useState("")
  const [externalUrl, setExternalUrl] = useState("")
  const [isPending, startTransition] = useTransition()

  const hasApproved = submissions.some((s) => s.status === "APPROVED")

  function openNew() {
    setEditingId(null)
    setTitle("")
    setDescriptionMd("")
    setExternalUrl("")
    setFormOpen(true)
  }

  function openEdit(s: Submission) {
    setEditingId(s.id)
    setTitle(s.title)
    setDescriptionMd(s.descriptionMd)
    setExternalUrl(s.externalUrl ?? "")
    setFormOpen(true)
  }

  function handleSave() {
    startTransition(async () => {
      const result = editingId
        ? await updateSubmission(editingId, {
            title,
            descriptionMd,
            externalUrl: externalUrl || null,
          })
        : await createSubmission({
            moduleId,
            title,
            descriptionMd,
            externalUrl: externalUrl || null,
          })

      if (!result.success) {
        toast({
          title: "Fehler",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({ title: editingId ? "Einreichung aktualisiert" : "Einreichung gespeichert" })
      setFormOpen(false)
      setEditingId(null)

      // Optimistic refresh: refetch is handled by revalidatePath server-side;
      // clients will see fresh data on navigation. For immediate UI, update locally.
      const now = new Date().toISOString()
      if (editingId) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === editingId
              ? {
                  ...s,
                  title,
                  descriptionMd,
                  externalUrl: externalUrl || null,
                  status: "SUBMITTED",
                  submittedAt: now,
                  reviewedAt: null,
                  reviewerName: null,
                  reviewNotes: null,
                }
              : s
          )
        )
      } else {
        setSubmissions((prev) => [
          {
            id: `new-${Math.random().toString(36).slice(2)}`,
            title,
            descriptionMd,
            externalUrl: externalUrl || null,
            status: "SUBMITTED" as SubmissionStatus,
            submittedAt: now,
            reviewedAt: null,
            reviewerName: null,
            reviewNotes: null,
          },
          ...prev,
        ])
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Arbeitsprodukt
            {required && (
              <Badge variant="outline" className="text-[10px]">
                Pflicht fuer Abschluss
              </Badge>
            )}
            {hasApproved && (
              <Badge variant="success" className="text-[10px]">
                Nachweis erbracht
              </Badge>
            )}
          </CardTitle>
          {!formOpen && (
            <Button size="sm" onClick={openNew} variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Neue Einreichung
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {required && (
          <p className="text-xs text-muted-foreground">
            Auf dieser Kompetenzstufe wird der Nachweis durch ein reales
            Arbeitsprodukt erbracht. Reichen Sie einen konkreten Anwendungsfall
            aus Ihrem Arbeitsalltag ein — ein Multiplikator pruft und gibt frei.
          </p>
        )}

        {formOpen && (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <div className="space-y-1">
              <Label htmlFor="sub-title">Titel</Label>
              <Input
                id="sub-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Angebotsvorlage mit KI-Unterstuetzung"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sub-desc">Beschreibung (Markdown)</Label>
              <Textarea
                id="sub-desc"
                value={descriptionMd}
                onChange={(e) => setDescriptionMd(e.target.value)}
                className="min-h-[140px] font-mono text-sm"
                placeholder="Beschreiben Sie den Anwendungsfall: Aufgabe, Vorgehen, Prompt/Workflow, Ergebnis, Lessons Learned."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sub-url">Externer Link (optional)</Label>
              <Input
                id="sub-url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormOpen(false)}
                disabled={isPending}
              >
                Abbrechen
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending ? "Speichere..." : editingId ? "Aktualisieren" : "Einreichen"}
              </Button>
            </div>
          </div>
        )}

        {submissions.length === 0 && !formOpen && (
          <p className="text-sm text-muted-foreground">
            Noch keine Einreichung vorhanden.
          </p>
        )}

        {submissions.map((s) => (
          <div key={s.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{s.title}</span>
                  <Badge variant={submissionStatusVariant(s.status)}>
                    {formatSubmissionStatus(s.status)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Eingereicht: {new Date(s.submittedAt).toLocaleDateString("de-DE")}
                  {s.reviewerName && ` · Reviewer: ${s.reviewerName}`}
                  {s.reviewedAt &&
                    ` · Geprueft: ${new Date(s.reviewedAt).toLocaleDateString("de-DE")}`}
                </p>
              </div>
              {(s.status === "SUBMITTED" || s.status === "REWORK") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(s)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Bearbeiten
                </Button>
              )}
            </div>
            <div className="text-sm whitespace-pre-wrap text-muted-foreground">
              {s.descriptionMd}
            </div>
            {s.externalUrl && (
              <a
                href={s.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {s.externalUrl}
              </a>
            )}
            {s.reviewNotes && (
              <div className="text-xs border-l-2 border-primary/50 pl-2 py-1 bg-muted/40 rounded">
                <span className="font-medium">Reviewer-Notiz:</span>{" "}
                {s.reviewNotes}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
