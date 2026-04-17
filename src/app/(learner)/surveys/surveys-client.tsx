"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listActiveSurveysForUser, submitSurveyResponse } from "@/lib/actions/surveys"
import { toast } from "@/hooks/use-toast"
import { formatSurveyType, formatCompetenceLevel } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"
import type { CompetenceLevel } from "@prisma/client"

type Survey = Awaited<ReturnType<typeof listActiveSurveysForUser>>[number]
type Question = Survey["questions"][number]

const LEVEL_OPTIONS: CompetenceLevel[] = ["L1", "L2", "L3", "L4", "F1", "F2", "F3"]
const LIKERT_OPTIONS = ["1", "2", "3", "4", "5"]

export function SurveysClient({ initialSurveys }: { initialSurveys: Survey[] }) {
  const [surveys, setSurveys] = useState<Survey[]>(initialSurveys)
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({})
  const [selfLevel, setSelfLevel] = useState<Record<string, CompetenceLevel | "">>({})
  const [isPending, startTransition] = useTransition()

  function setAnswer(surveyId: string, questionId: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [surveyId]: { ...(prev[surveyId] ?? {}), [questionId]: value },
    }))
  }

  function submit(survey: Survey) {
    const surveyAnswers = answers[survey.id] ?? {}
    const payload = survey.questions
      .filter((q) => q.type !== "LEVEL_SELF")
      .map((q) => ({ questionId: q.id, value: surveyAnswers[q.id] ?? "" }))

    const level = selfLevel[survey.id] || null

    startTransition(async () => {
      const res = await submitSurveyResponse(survey.id, payload, (level as CompetenceLevel | null) ?? null)
      if (!res.success) {
        toast({ title: "Fehler", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Danke fuer Ihre Einreichung!" })
      const refreshed = await listActiveSurveysForUser()
      setSurveys(refreshed)
      setAnswers((prev) => ({ ...prev, [survey.id]: {} }))
    })
  }

  if (surveys.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <p className="text-muted-foreground">
            Aktuell sind keine Umfragen aktiv.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {surveys.map((s) => (
        <Card key={s.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {s.title}
                  <Badge variant="outline">{formatSurveyType(s.type)}</Badge>
                </CardTitle>
                {s.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {s.description}
                  </p>
                )}
              </div>
              {s.alreadySubmitted && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Eingereicht
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {s.alreadySubmitted ? (
              <p className="text-sm text-muted-foreground">
                Sie haben diese Umfrage bereits eingereicht
                {s.submittedAt
                  ? ` (${new Date(s.submittedAt).toLocaleDateString("de-DE")})`
                  : ""}
                . Vielen Dank!
              </p>
            ) : (
              <>
                {s.questions.map((q) => (
                  <QuestionInput
                    key={q.id}
                    question={q}
                    value={answers[s.id]?.[q.id] ?? ""}
                    onChange={(v) => setAnswer(s.id, q.id, v)}
                    selfLevel={selfLevel[s.id] ?? ""}
                    setSelfLevel={(v) =>
                      setSelfLevel((prev) => ({ ...prev, [s.id]: v }))
                    }
                  />
                ))}
                <div className="flex justify-end pt-2">
                  <Button onClick={() => submit(s)} disabled={isPending}>
                    {isPending ? "Sende..." : "Einreichen"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function QuestionInput({
  question,
  value,
  onChange,
  selfLevel,
  setSelfLevel,
}: {
  question: Question
  value: string
  onChange: (v: string) => void
  selfLevel: CompetenceLevel | ""
  setSelfLevel: (v: CompetenceLevel | "") => void
}) {
  if (question.type === "LEVEL_SELF") {
    return (
      <div className="space-y-2">
        <Label>{question.prompt}</Label>
        <Select
          value={selfLevel}
          onValueChange={(v) => setSelfLevel(v as CompetenceLevel)}
        >
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Stufe waehlen" />
          </SelectTrigger>
          <SelectContent>
            {LEVEL_OPTIONS.map((l) => (
              <SelectItem key={l} value={l}>
                {formatCompetenceLevel(l)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (question.type === "LIKERT_5") {
    return (
      <div className="space-y-2">
        <Label>{question.prompt}</Label>
        <div className="flex gap-2">
          {LIKERT_OPTIONS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`h-10 w-10 rounded-full border text-sm font-medium transition-colors ${
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

  if (question.type === "MULTIPLE_CHOICE") {
    const opts = question.options ?? []
    return (
      <div className="space-y-2">
        <Label>{question.prompt}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Bitte waehlen" />
          </SelectTrigger>
          <SelectContent>
            {opts.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>{question.prompt}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[80px]"
      />
    </div>
  )
}
