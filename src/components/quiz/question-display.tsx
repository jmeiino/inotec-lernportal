"use client"

import type { QuizQuestionClient } from "@/lib/actions/quiz"
import { Card, CardContent } from "@/components/ui/card"

interface QuestionDisplayProps {
  question: QuizQuestionClient
  questionIndex: number
  totalQuestions: number
  answer: string
  onAnswer: (answer: string) => void
  disabled?: boolean
}

type OptionItem = { key: string; text: string }

function parseOptions(options: unknown): OptionItem[] {
  if (Array.isArray(options)) {
    return options.map((opt, i) => {
      if (typeof opt === "object" && opt !== null && "key" in opt && "text" in opt) {
        return { key: String((opt as { key: string }).key), text: String((opt as { text: string }).text) }
      }
      return { key: String.fromCharCode(65 + i), text: String(opt) }
    })
  }
  if (typeof options === "object" && options !== null) {
    return Object.entries(options as Record<string, string>).map(([key, text]) => ({
      key,
      text: String(text),
    }))
  }
  return []
}

export function QuestionDisplay({
  question,
  questionIndex,
  totalQuestions,
  answer,
  onAnswer,
  disabled = false,
}: QuestionDisplayProps) {
  const options = parseOptions(question.options)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Frage {questionIndex + 1} von {totalQuestions}
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {question.type === "SINGLE_CHOICE" && "Einzelauswahl"}
          {question.type === "MULTI_CHOICE" && "Mehrfachauswahl"}
          {question.type === "TRUE_FALSE" && "Richtig / Falsch"}
          {question.type === "MATCHING" && "Zuordnung"}
        </span>
      </div>

      <h3 className="text-lg font-semibold">{question.question}</h3>

      {question.type === "SINGLE_CHOICE" && (
        <SingleChoiceOptions
          options={options}
          selected={answer}
          onSelect={onAnswer}
          disabled={disabled}
        />
      )}

      {question.type === "MULTI_CHOICE" && (
        <MultiChoiceOptions
          options={options}
          selected={answer}
          onSelect={onAnswer}
          disabled={disabled}
        />
      )}

      {question.type === "TRUE_FALSE" && (
        <TrueFalseOptions
          selected={answer}
          onSelect={onAnswer}
          disabled={disabled}
        />
      )}

      {question.type === "MATCHING" && (
        <SingleChoiceOptions
          options={options}
          selected={answer}
          onSelect={onAnswer}
          disabled={disabled}
        />
      )}
    </div>
  )
}

function SingleChoiceOptions({
  options,
  selected,
  onSelect,
  disabled,
}: {
  options: OptionItem[]
  selected: string
  onSelect: (val: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <Card
          key={opt.key}
          className={`cursor-pointer transition-all ${
            selected === opt.key
              ? "ring-2 ring-primary bg-primary/5"
              : "hover:bg-muted/50"
          } ${disabled ? "pointer-events-none opacity-60" : ""}`}
          onClick={() => !disabled && onSelect(opt.key)}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                selected === opt.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              }`}
            >
              {opt.key}
            </div>
            <span className="text-sm">{opt.text}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function MultiChoiceOptions({
  options,
  selected,
  onSelect,
  disabled,
}: {
  options: OptionItem[]
  selected: string
  onSelect: (val: string) => void
  disabled: boolean
}) {
  const selectedKeys = selected
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  const toggleOption = (key: string) => {
    if (disabled) return
    const newKeys = selectedKeys.includes(key)
      ? selectedKeys.filter((k) => k !== key)
      : [...selectedKeys, key]
    onSelect(newKeys.sort().join(","))
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Mehrere Antworten sind moglich.
      </p>
      {options.map((opt) => {
        const isSelected = selectedKeys.includes(opt.key)
        return (
          <Card
            key={opt.key}
            className={`cursor-pointer transition-all ${
              isSelected
                ? "ring-2 ring-primary bg-primary/5"
                : "hover:bg-muted/50"
            } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            onClick={() => toggleOption(opt.key)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={`w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-bold ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30"
                }`}
              >
                {isSelected ? "\u2713" : opt.key}
              </div>
              <span className="text-sm">{opt.text}</span>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function TrueFalseOptions({
  selected,
  onSelect,
  disabled,
}: {
  selected: string
  onSelect: (val: string) => void
  disabled: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect("true")}
        className={`p-6 rounded-lg border-2 text-lg font-bold transition-all ${
          selected === "true"
            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
            : "border-muted-foreground/20 hover:border-green-300 hover:bg-green-50/50"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        Richtig
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect("false")}
        className={`p-6 rounded-lg border-2 text-lg font-bold transition-all ${
          selected === "false"
            ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
            : "border-muted-foreground/20 hover:border-red-300 hover:bg-red-50/50"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        Falsch
      </button>
    </div>
  )
}
