"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, CheckCircle2 } from "lucide-react"
import { submitModuleFeedback } from "@/lib/actions/feedback"
import { toast } from "@/hooks/use-toast"

interface ModuleFeedbackProps {
  moduleId: string
  existing: {
    relevance: number
    quality: number
    openText: string | null
    submittedAt: Date
  } | null
}

function Rating({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`h-9 w-9 rounded-full border text-sm font-medium transition-colors ${
              value === v
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-muted"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ModuleFeedback({ moduleId, existing }: ModuleFeedbackProps) {
  const [relevance, setRelevance] = useState(existing?.relevance ?? 0)
  const [quality, setQuality] = useState(existing?.quality ?? 0)
  const [openText, setOpenText] = useState(existing?.openText ?? "")
  const [editing, setEditing] = useState(!existing)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (relevance < 1 || quality < 1) {
      toast({
        title: "Bitte beide Skalen ausfuellen",
        variant: "destructive",
      })
      return
    }
    startTransition(async () => {
      const res = await submitModuleFeedback({
        moduleId,
        relevance,
        quality,
        openText: openText || null,
      })
      if (!res.success) {
        toast({
          title: "Fehler",
          description: res.error,
          variant: "destructive",
        })
        return
      }
      toast({ title: "Danke fuer Ihr Feedback!" })
      setEditing(false)
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Kurz-Feedback zum Modul
          {existing && !editing && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Abgegeben
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {existing && !editing ? (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Relevanz:</span>{" "}
              <strong>{existing.relevance}/5</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Qualitaet:</span>{" "}
              <strong>{existing.quality}/5</strong>
            </p>
            {existing.openText && (
              <p className="text-muted-foreground italic">
                „{existing.openText}"
              </p>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Anpassen
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Hilft uns, Module gezielt zu verbessern. Dauert 30 Sekunden.
            </p>
            <Rating
              label="Wie relevant war das Modul fuer Ihre Arbeit? (1 = gar nicht, 5 = sehr)"
              value={relevance}
              onChange={setRelevance}
            />
            <Rating
              label="Wie bewerten Sie die Qualitaet der Inhalte? (1 = schwach, 5 = sehr gut)"
              value={quality}
              onChange={setQuality}
            />
            <div className="space-y-2">
              <Label htmlFor="fb-open">
                Was hat geholfen / was fehlt? (optional)
              </Label>
              <Textarea
                id="fb-open"
                value={openText}
                onChange={(e) => setOpenText(e.target.value)}
                className="min-h-[70px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              {existing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={isPending}
                >
                  Abbrechen
                </Button>
              )}
              <Button size="sm" onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Sende..." : "Absenden"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
