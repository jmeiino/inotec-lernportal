"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createQuestion, updateQuestion } from "@/lib/actions/quizzes"
import { Save, X } from "lucide-react"
import type { QuestionType } from "@prisma/client"

interface QuestionData {
  id: string
  question: string
  type: QuestionType
  options: string[]
  correctAnswer: string
  explanation: string | null
  sortOrder: number
}

interface QuestionEditorProps {
  question: QuestionData | null
  quizId: string
  isNew?: boolean
  onSaved: () => void
  onCancel: () => void
}

export function QuestionEditor({
  question,
  quizId,
  isNew,
  onSaved,
  onCancel,
}: QuestionEditorProps) {
  const [questionText, setQuestionText] = useState(question?.question ?? "")
  const [type, setType] = useState<QuestionType>(question?.type ?? "SINGLE_CHOICE")
  const [options, setOptions] = useState<string[]>(
    question?.options ?? ["", "", "", ""]
  )
  const [correctAnswer, setCorrectAnswer] = useState(question?.correctAnswer ?? "")
  const [explanation, setExplanation] = useState(question?.explanation ?? "")
  const [saving, setSaving] = useState(false)

  // When type changes to TRUE_FALSE, set appropriate options
  useEffect(() => {
    if (type === "TRUE_FALSE") {
      setOptions(["Wahr", "Falsch"])
      if (correctAnswer !== "0" && correctAnswer !== "1") {
        setCorrectAnswer("0")
      }
    } else if (options.length < 4) {
      setOptions((prev) => {
        const next = [...prev]
        while (next.length < 4) next.push("")
        return next
      })
    }
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleOptionChange(index: number, value: string) {
    setOptions((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function toggleCorrectForMulti(index: string) {
    const current = correctAnswer.split(",").filter(Boolean)
    if (current.includes(index)) {
      setCorrectAnswer(current.filter((c) => c !== index).join(","))
    } else {
      setCorrectAnswer([...current, index].join(","))
    }
  }

  async function handleSave() {
    if (!questionText.trim() || !correctAnswer) return
    setSaving(true)
    try {
      const data = {
        question: questionText,
        type,
        options,
        correctAnswer,
        explanation: explanation || null,
      }
      if (isNew || !question) {
        await createQuestion(quizId, data)
      } else {
        await updateQuestion(question.id, data)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const isMulti = type === "MULTI_CHOICE"
  const correctIndices = correctAnswer.split(",").filter(Boolean)

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">
          {isNew ? "Neue Frage" : "Frage bearbeiten"}
        </h4>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Fragetext</Label>
        <Textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Fragetext eingeben..."
          className="min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Fragetyp</Label>
        <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SINGLE_CHOICE">Single Choice</SelectItem>
            <SelectItem value="MULTI_CHOICE">Multiple Choice</SelectItem>
            <SelectItem value="TRUE_FALSE">Wahr/Falsch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <Label>Antwortmöglichkeiten</Label>
        {type === "TRUE_FALSE" ? (
          <div className="space-y-2">
            {["Wahr", "Falsch"].map((label, idx) => (
              <label
                key={idx}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="radio"
                  name="tf-correct"
                  checked={correctAnswer === String(idx)}
                  onChange={() => setCorrectAnswer(String(idx))}
                  className="h-4 w-4"
                />
                <span>{label}</span>
                {correctAnswer === String(idx) && (
                  <span className="text-xs text-green-600 font-medium">
                    (Korrekt)
                  </span>
                )}
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm font-medium w-6">
                  {String.fromCharCode(65 + idx)}
                </span>
                <Input
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  className="flex-1"
                />
                {isMulti ? (
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={correctIndices.includes(String(idx))}
                      onChange={() => toggleCorrectForMulti(String(idx))}
                      className="h-4 w-4"
                    />
                    <span className="text-xs text-muted-foreground">Korrekt</span>
                  </label>
                ) : (
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="sc-correct"
                      checked={correctAnswer === String(idx)}
                      onChange={() => setCorrectAnswer(String(idx))}
                      className="h-4 w-4"
                    />
                    <span className="text-xs text-muted-foreground">Korrekt</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Erklärung (optional)</Label>
        <Textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Erklärung zur korrekten Antwort..."
          className="min-h-[60px]"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving || !questionText.trim()}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Speichern..." : "Speichern"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
