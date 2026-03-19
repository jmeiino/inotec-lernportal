"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateLesson, createLesson, deleteLesson } from "@/lib/actions/courses"
import { Save, Trash2 } from "lucide-react"

interface LessonData {
  id: string
  title: string
  contentMd: string
  sortOrder: number
}

interface LessonEditorProps {
  lesson: LessonData | null
  moduleId: string
  isNew?: boolean
  onSaved: () => void
  onCancel?: () => void
}

export function LessonEditor({
  lesson,
  moduleId,
  isNew,
  onSaved,
  onCancel,
}: LessonEditorProps) {
  const [title, setTitle] = useState(lesson?.title ?? "")
  const [contentMd, setContentMd] = useState(lesson?.contentMd ?? "")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      if (isNew || !lesson) {
        await createLesson(moduleId, { title, contentMd })
      } else {
        await updateLesson(lesson.id, { title, contentMd })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!lesson || isNew) return
    if (!confirm("Lektion wirklich löschen?")) return
    setDeleting(true)
    try {
      await deleteLesson(lesson.id)
      onSaved()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">
          {isNew ? "Neue Lektion" : `Lektion: ${lesson?.title}`}
        </h4>
        <div className="flex items-center gap-2">
          {!isNew && lesson && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Löschen
            </Button>
          )}
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Abbrechen
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lesson-title">Titel</Label>
        <Input
          id="lesson-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lektionstitel"
        />
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Bearbeiten</TabsTrigger>
          <TabsTrigger value="preview">Vorschau</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Textarea
            value={contentMd}
            onChange={(e) => setContentMd(e.target.value)}
            placeholder="Markdown-Inhalt der Lektion..."
            className="min-h-[300px] font-mono text-sm"
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="border rounded-lg p-4 min-h-[300px] prose prose-sm max-w-none">
            {contentMd ? (
              <pre className="whitespace-pre-wrap text-sm">{contentMd}</pre>
            ) : (
              <p className="text-muted-foreground">Kein Inhalt vorhanden.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={saving || !title.trim()}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Speichern..." : "Speichern"}
      </Button>
    </div>
  )
}
