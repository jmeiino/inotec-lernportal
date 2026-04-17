"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  listSurveysAdmin,
  createSurvey,
  toggleSurveyActive,
} from "@/lib/actions/surveys"
import { toast } from "@/hooks/use-toast"
import {
  formatSurveyType,
  formatSurveyQuestionType,
  formatCompetenceLevel,
} from "@/lib/utils"
import { Plus, Trash2 } from "lucide-react"
import type {
  CompetenceLevel,
  SurveyQuestionType,
  SurveyType,
} from "@prisma/client"

type Survey = Awaited<ReturnType<typeof listSurveysAdmin>>[number]

const SURVEY_TYPES: SurveyType[] = ["BASELINE", "PULSE", "SELF_ASSESSMENT", "ANNUAL"]
const QUESTION_TYPES: SurveyQuestionType[] = [
  "LIKERT_5",
  "OPEN_TEXT",
  "LEVEL_SELF",
  "MULTIPLE_CHOICE",
]
const LEVELS: CompetenceLevel[] = ["L1", "L2", "L3", "L4", "F1", "F2", "F3"]

type DraftQuestion = {
  prompt: string
  type: SurveyQuestionType
  options: string
  competenceLevel: CompetenceLevel | "__none__"
}

export function SurveysAdminClient({ initial }: { initial: Survey[] }) {
  const [surveys, setSurveys] = useState<Survey[]>(initial)
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)

  const [type, setType] = useState<SurveyType>("PULSE")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    { prompt: "", type: "LIKERT_5", options: "", competenceLevel: "__none__" },
  ])

  function refresh() {
    startTransition(async () => {
      const data = await listSurveysAdmin()
      setSurveys(data)
    })
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { prompt: "", type: "LIKERT_5", options: "", competenceLevel: "__none__" },
    ])
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateQuestion(idx: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    )
  }

  function resetForm() {
    setType("PULSE")
    setTitle("")
    setDescription("")
    setQuestions([
      { prompt: "", type: "LIKERT_5", options: "", competenceLevel: "__none__" },
    ])
  }

  function handleCreate() {
    startTransition(async () => {
      const res = await createSurvey({
        type,
        title,
        description: description || null,
        questions: questions
          .filter((q) => q.prompt.trim().length > 0)
          .map((q) => ({
            prompt: q.prompt,
            type: q.type,
            options:
              q.type === "MULTIPLE_CHOICE"
                ? q.options
                    .split(",")
                    .map((o) => o.trim())
                    .filter(Boolean)
                : [],
            competenceLevel:
              q.competenceLevel === "__none__" ? null : q.competenceLevel,
          })),
      })
      if (!res.success) {
        toast({ title: "Fehler", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Umfrage angelegt" })
      setDialogOpen(false)
      resetForm()
      refresh()
    })
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleSurveyActive(id, active)
      refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Neue Umfrage
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Fragen</TableHead>
              <TableHead>Antworten</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Erstellt</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surveys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Keine Umfragen vorhanden.
                </TableCell>
              </TableRow>
            ) : (
              surveys.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatSurveyType(s.type)}</Badge>
                  </TableCell>
                  <TableCell>{s.questionCount}</TableCell>
                  <TableCell>{s.responseCount}</TableCell>
                  <TableCell>
                    <Badge variant={s.active ? "success" : "secondary"}>
                      {s.active ? "Aktiv" : "Pausiert"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(s.id, !s.active)}
                      disabled={isPending}
                    >
                      {s.active ? "Pausieren" : "Aktivieren"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neue Umfrage anlegen</DialogTitle>
            <DialogDescription>
              Frageblock definieren. Antworten werden anonym gespeichert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="s-type">Typ</Label>
                <Select value={type} onValueChange={(v) => setType(v as SurveyType)}>
                  <SelectTrigger id="s-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SURVEY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatSurveyType(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="s-title">Titel</Label>
                <Input
                  id="s-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-desc">Beschreibung</Label>
              <Textarea
                id="s-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Fragen</Label>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Frage
                </Button>
              </div>
              {questions.map((q, idx) => (
                <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Frage {idx + 1}
                    </span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Textarea
                    placeholder="Fragetext"
                    value={q.prompt}
                    onChange={(e) => updateQuestion(idx, { prompt: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={q.type}
                      onValueChange={(v) =>
                        updateQuestion(idx, { type: v as SurveyQuestionType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {formatSurveyQuestionType(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={q.competenceLevel}
                      onValueChange={(v) =>
                        updateQuestion(idx, {
                          competenceLevel: v as CompetenceLevel | "__none__",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Stufe: keine</SelectItem>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {formatCompetenceLevel(l)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {q.type === "MULTIPLE_CHOICE" && (
                    <Input
                      placeholder="Optionen, Komma-getrennt"
                      value={q.options}
                      onChange={(e) =>
                        updateQuestion(idx, { options: e.target.value })
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                resetForm()
              }}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? "Speichere..." : "Anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
