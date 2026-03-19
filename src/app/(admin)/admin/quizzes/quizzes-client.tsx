"use client"

import { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SimpleBarChart } from "@/components/admin/simple-bar-chart"
import { QuestionEditor } from "@/components/admin/question-editor"
import {
  getQuizForEdit,
  updateQuizSettings,
  deleteQuestion,
  reorderQuestions,
  getQuizStats,
} from "@/lib/actions/quizzes"
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Save,
  BarChart3,
} from "lucide-react"

type ModuleOption = {
  id: string
  title: string
  code: string
  trackName: string
  hasQuiz: boolean
  quizId: string | null
}

type QuizData = Awaited<ReturnType<typeof getQuizForEdit>>
type QuizStatsData = Awaited<ReturnType<typeof getQuizStats>>

const typeLabels: Record<string, string> = {
  SINGLE_CHOICE: "Single Choice",
  MULTI_CHOICE: "Multiple Choice",
  TRUE_FALSE: "Wahr/Falsch",
  MATCHING: "Zuordnung",
}

interface QuizzesClientProps {
  modules: ModuleOption[]
}

export function QuizzesClient({ modules }: QuizzesClientProps) {
  const [selectedModuleId, setSelectedModuleId] = useState("")
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [stats, setStats] = useState<QuizStatsData | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [creatingQuestion, setCreatingQuestion] = useState(false)
  const [passingScore, setPassingScore] = useState(70)
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timeLimitMin, setTimeLimitMin] = useState(15)
  const [savingSettings, setSavingSettings] = useState(false)

  const loadQuiz = useCallback(async (moduleId: string) => {
    const q = await getQuizForEdit(moduleId)
    setQuiz(q)
    setPassingScore(q.passingScore)
    setTimerEnabled(q.timeLimitMin !== null)
    setTimeLimitMin(q.timeLimitMin ?? 15)
    setShowStats(false)
    setStats(null)
    setEditingQuestionId(null)
    setCreatingQuestion(false)
  }, [])

  async function handleModuleChange(moduleId: string) {
    setSelectedModuleId(moduleId)
    await loadQuiz(moduleId)
  }

  async function handleSaveSettings() {
    if (!quiz) return
    setSavingSettings(true)
    try {
      await updateQuizSettings(quiz.id, {
        passingScore,
        timeLimitMin: timerEnabled ? timeLimitMin : null,
      })
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleQuestionSaved() {
    if (!selectedModuleId) return
    await loadQuiz(selectedModuleId)
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Frage wirklich löschen?")) return
    await deleteQuestion(questionId)
    if (selectedModuleId) await loadQuiz(selectedModuleId)
  }

  async function moveQuestionUp(idx: number) {
    if (!quiz || idx <= 0) return
    const ids = [...quiz.questions.map((q) => q.id)]
    const temp = ids[idx - 1]
    ids[idx - 1] = ids[idx]
    ids[idx] = temp
    await reorderQuestions(quiz.id, ids)
    if (selectedModuleId) await loadQuiz(selectedModuleId)
  }

  async function moveQuestionDown(idx: number) {
    if (!quiz || idx >= quiz.questions.length - 1) return
    const ids = [...quiz.questions.map((q) => q.id)]
    const temp = ids[idx + 1]
    ids[idx + 1] = ids[idx]
    ids[idx] = temp
    await reorderQuestions(quiz.id, ids)
    if (selectedModuleId) await loadQuiz(selectedModuleId)
  }

  async function handleShowStats() {
    if (!quiz) return
    if (showStats) {
      setShowStats(false)
      return
    }
    const s = await getQuizStats(quiz.id)
    setStats(s)
    setShowStats(true)
  }

  return (
    <div className="space-y-6">
      {/* Module selector */}
      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <Label>Modul wählen</Label>
          <Select value={selectedModuleId} onValueChange={handleModuleChange}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Modul auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {modules.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="text-muted-foreground">{m.code}</span> - {m.title}
                  <span className="text-xs text-muted-foreground ml-2">
                    ({m.trackName})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {quiz && (
          <Button
            variant="outline"
            className="mt-5"
            onClick={handleShowStats}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showStats ? "Statistik ausblenden" : "Statistik anzeigen"}
          </Button>
        )}
      </div>

      {!quiz ? (
        <div className="text-center text-muted-foreground py-12">
          Wählen Sie ein Modul, um den Quiz-Editor zu öffnen.
        </div>
      ) : (
        <>
          {/* Stats section */}
          {showStats && stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quiz-Statistik</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{stats.totalAttempts}</div>
                    <div className="text-xs text-muted-foreground">Versuche gesamt</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.passRate}%</div>
                    <div className="text-xs text-muted-foreground">Bestehensquote</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.avgScore}%</div>
                    <div className="text-xs text-muted-foreground">Durchschnittsscore</div>
                  </div>
                </div>
                {stats.questionStats.length > 0 && (
                  <SimpleBarChart
                    title="Korrektquote pro Frage"
                    items={stats.questionStats.map((q) => ({
                      label: `F${q.sortOrder}: ${q.question}`,
                      value: q.correctPct,
                      maxValue: 100,
                      color:
                        q.correctPct < 40
                          ? "hsl(0 84% 60%)"
                          : q.correctPct < 60
                          ? "hsl(38 92% 50%)"
                          : undefined,
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Quiz settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quiz-Einstellungen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label htmlFor="passing-score">
                    Bestehensgrenze: {passingScore}%
                  </Label>
                  <Input
                    id="passing-score"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    className="w-48"
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={timerEnabled}
                      onChange={(e) => setTimerEnabled(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Zeitlimit aktivieren
                  </label>
                  {timerEnabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={timeLimitMin}
                        onChange={(e) => setTimeLimitMin(Number(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">Minuten</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingSettings ? "Speichern..." : "Einstellungen speichern"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Questions list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">
                Fragen ({quiz.questions.length})
              </h3>
              {!creatingQuestion && (
                <Button onClick={() => { setCreatingQuestion(true); setEditingQuestionId(null) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Frage
                </Button>
              )}
            </div>

            {quiz.questions.map((q, idx) =>
              editingQuestionId === q.id ? (
                <QuestionEditor
                  key={q.id}
                  question={q}
                  quizId={quiz.id}
                  onSaved={handleQuestionSaved}
                  onCancel={() => setEditingQuestionId(null)}
                />
              ) : (
                <div
                  key={q.id}
                  className="flex items-center gap-2 border rounded-lg p-3 bg-card"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => moveQuestionUp(idx)}
                      disabled={idx === 0}
                      aria-label="Nach oben"
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </button>
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => moveQuestionDown(idx)}
                      disabled={idx === quiz.questions.length - 1}
                      aria-label="Nach unten"
                    >
                      <GripVertical className="h-4 w-4 -rotate-90" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">F{idx + 1}.</span>
                      <Badge variant="outline" className="text-[10px]">
                        {typeLabels[q.type] || q.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {q.question}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingQuestionId(q.id); setCreatingQuestion(false) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteQuestion(q.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            )}

            {creatingQuestion && (
              <QuestionEditor
                question={null}
                quizId={quiz.id}
                isNew
                onSaved={handleQuestionSaved}
                onCancel={() => setCreatingQuestion(false)}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
