"use client"

import { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LessonEditor } from "@/components/admin/lesson-editor"
import { MaterialManager } from "@/components/admin/material-manager"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getCoursesTree,
  getModuleDetail,
  updateModule,
  reorderLessons,
  updateTrack,
} from "@/lib/actions/courses"
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  GripVertical,
  Plus,
  Save,
  Pencil,
} from "lucide-react"
import {
  cn,
  formatCompetenceLevel,
  formatBusinessRole,
  formatTrackCategory,
} from "@/lib/utils"
import type {
  ModuleFormat,
  CompetenceLevel,
  TrackCategory,
  BusinessRole,
} from "@prisma/client"

const COMPETENCE_LEVELS: CompetenceLevel[] = ["L1", "L2", "L3", "L4", "F1", "F2", "F3"]
const TRACK_CATEGORIES: TrackCategory[] = ["FACH", "FUEHRUNG"]
const BUSINESS_ROLES: BusinessRole[] = [
  "VERTRIEB",
  "PRODUKTION",
  "VERWALTUNG",
  "IT",
  "HR",
  "FUEHRUNG",
]

type CoursesTree = Awaited<ReturnType<typeof getCoursesTree>>
type ModuleDetail = Awaited<ReturnType<typeof getModuleDetail>>

interface CoursesClientProps {
  initialTree: CoursesTree
}

export function CoursesClient({ initialTree }: CoursesClientProps) {
  const [tree, setTree] = useState(initialTree)
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(
    new Set(initialTree.map((t) => t.id))
  )
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [moduleDetail, setModuleDetail] = useState<ModuleDetail | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [creatingLesson, setCreatingLesson] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const [trackForm, setTrackForm] = useState<{
    name: string
    description: string
    competenceLevel: CompetenceLevel
    category: TrackCategory
    businessRole: BusinessRole | "__none__"
  } | null>(null)
  const [trackSaving, setTrackSaving] = useState(false)

  // Module metadata form
  const [metaTitle, setMetaTitle] = useState("")
  const [metaCode, setMetaCode] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [metaDuration, setMetaDuration] = useState(1)
  const [metaFormat, setMetaFormat] = useState<ModuleFormat>("ONLINE")

  const refreshTree = useCallback(async () => {
    const t = await getCoursesTree()
    setTree(t)
  }, [])

  async function selectModule(moduleId: string) {
    setSelectedModuleId(moduleId)
    setEditingLessonId(null)
    setCreatingLesson(false)
    const detail = await getModuleDetail(moduleId)
    setModuleDetail(detail)
    setMetaTitle(detail.title)
    setMetaCode(detail.code)
    setMetaDescription(detail.description ?? "")
    setMetaDuration(detail.durationHours)
    setMetaFormat(detail.format)
  }

  async function handleSaveModule() {
    if (!selectedModuleId) return
    setSaving(true)
    try {
      await updateModule(selectedModuleId, {
        title: metaTitle,
        code: metaCode,
        description: metaDescription || null,
        durationHours: metaDuration,
        format: metaFormat,
        prerequisites: moduleDetail?.prerequisites ?? [],
      })
      await refreshTree()
      // Refresh detail
      const detail = await getModuleDetail(selectedModuleId)
      setModuleDetail(detail)
    } finally {
      setSaving(false)
    }
  }

  async function handleLessonSaved() {
    if (!selectedModuleId) return
    const detail = await getModuleDetail(selectedModuleId)
    setModuleDetail(detail)
    setEditingLessonId(null)
    setCreatingLesson(false)
    await refreshTree()
  }

  async function handleMaterialUpdated() {
    if (!selectedModuleId) return
    const detail = await getModuleDetail(selectedModuleId)
    setModuleDetail(detail)
  }

  function toggleTrack(trackId: string) {
    setExpandedTracks((prev) => {
      const next = new Set(prev)
      if (next.has(trackId)) {
        next.delete(trackId)
      } else {
        next.add(trackId)
      }
      return next
    })
  }

  function openTrackEdit(trackId: string) {
    const track = tree.find((t) => t.id === trackId)
    if (!track) return
    setEditingTrackId(trackId)
    setTrackForm({
      name: track.name,
      description: track.description ?? "",
      competenceLevel: track.competenceLevel,
      category: track.category,
      businessRole: track.businessRole ?? "__none__",
    })
  }

  async function handleSaveTrack() {
    if (!editingTrackId || !trackForm) return
    setTrackSaving(true)
    try {
      await updateTrack(editingTrackId, {
        name: trackForm.name,
        description: trackForm.description || null,
        competenceLevel: trackForm.competenceLevel,
        category: trackForm.category,
        businessRole:
          trackForm.businessRole === "__none__" ? null : trackForm.businessRole,
      })
      await refreshTree()
      setEditingTrackId(null)
      setTrackForm(null)
    } finally {
      setTrackSaving(false)
    }
  }

  async function moveLessonUp(lessonIndex: number) {
    if (!moduleDetail || lessonIndex <= 0) return
    const lessons = [...moduleDetail.lessons]
    const temp = lessons[lessonIndex - 1]
    lessons[lessonIndex - 1] = lessons[lessonIndex]
    lessons[lessonIndex] = temp
    await reorderLessons(
      moduleDetail.id,
      lessons.map((l) => l.id)
    )
    await handleLessonSaved()
  }

  async function moveLessonDown(lessonIndex: number) {
    if (!moduleDetail || lessonIndex >= moduleDetail.lessons.length - 1) return
    const lessons = [...moduleDetail.lessons]
    const temp = lessons[lessonIndex + 1]
    lessons[lessonIndex + 1] = lessons[lessonIndex]
    lessons[lessonIndex] = temp
    await reorderLessons(
      moduleDetail.id,
      lessons.map((l) => l.id)
    )
    await handleLessonSaved()
  }

  const formatLabels: Record<string, string> = {
    ONLINE: "Online",
    PRESENCE: "Präsenz",
    HYBRID: "Hybrid",
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Left panel: Tree navigation */}
      <div className="w-72 shrink-0 border rounded-lg bg-card overflow-y-auto">
        <div className="p-3 border-b">
          <h3 className="text-sm font-semibold">Lernpfade & Module</h3>
        </div>
        <div className="p-2 space-y-1">
          {tree.map((track) => (
            <div key={track.id}>
              <div className="flex items-center gap-1 w-full">
                <button
                  className="flex items-center gap-2 flex-1 px-2 py-1.5 rounded text-sm font-medium hover:bg-muted text-left"
                  onClick={() => toggleTrack(track.id)}
                >
                  {expandedTracks.has(track.id) ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{track.name}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {track.modules.length}
                  </Badge>
                </button>
                <button
                  className="p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => openTrackEdit(track.id)}
                  aria-label="Lernpfad bearbeiten"
                  title="Lernpfad bearbeiten"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              {expandedTracks.has(track.id) && (
                <div className="ml-4 mb-1 px-2 py-1 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {formatCompetenceLevel(track.competenceLevel)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {formatTrackCategory(track.category)}
                  </Badge>
                  {track.businessRole && (
                    <Badge variant="outline" className="text-[10px]">
                      {formatBusinessRole(track.businessRole)}
                    </Badge>
                  )}
                </div>
              )}
              {expandedTracks.has(track.id) && (
                <div className="ml-4 space-y-0.5">
                  {track.modules.map((mod) => (
                    <button
                      key={mod.id}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-muted text-left",
                        selectedModuleId === mod.id && "bg-primary/10 text-primary"
                      )}
                      onClick={() => selectModule(mod.id)}
                    >
                      <BookOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{mod.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel: Module editor */}
      <div className="flex-1 overflow-y-auto">
        {!selectedModuleId || !moduleDetail ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Wählen Sie ein Modul zum Bearbeiten aus.
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs defaultValue="metadata">
              <TabsList>
                <TabsTrigger value="metadata">Modul-Daten</TabsTrigger>
                <TabsTrigger value="lessons">
                  Lektionen ({moduleDetail.lessons.length})
                </TabsTrigger>
                <TabsTrigger value="materials">
                  Materialien ({moduleDetail.materials.length})
                </TabsTrigger>
              </TabsList>

              {/* Metadata tab */}
              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mod-title">Titel</Label>
                    <Input
                      id="mod-title"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mod-code">Code</Label>
                    <Input
                      id="mod-code"
                      value={metaCode}
                      onChange={(e) => setMetaCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mod-duration">Dauer (Stunden)</Label>
                    <Input
                      id="mod-duration"
                      type="number"
                      min={1}
                      value={metaDuration}
                      onChange={(e) => setMetaDuration(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mod-format">Format</Label>
                    <Select
                      value={metaFormat}
                      onValueChange={(v) => setMetaFormat(v as ModuleFormat)}
                    >
                      <SelectTrigger id="mod-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONLINE">Online</SelectItem>
                        <SelectItem value="PRESENCE">Präsenz</SelectItem>
                        <SelectItem value="HYBRID">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mod-desc">Beschreibung</Label>
                  <Textarea
                    id="mod-desc"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <Button onClick={handleSaveModule} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Speichern..." : "Modul speichern"}
                </Button>
              </TabsContent>

              {/* Lessons tab */}
              <TabsContent value="lessons" className="space-y-4">
                {moduleDetail.lessons.map((lesson, idx) => (
                  <div key={lesson.id}>
                    {editingLessonId === lesson.id ? (
                      <LessonEditor
                        lesson={lesson}
                        moduleId={moduleDetail.id}
                        onSaved={handleLessonSaved}
                        onCancel={() => setEditingLessonId(null)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 border rounded-lg p-3 bg-card">
                        <div className="flex flex-col gap-0.5">
                          <button
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            onClick={() => moveLessonUp(idx)}
                            disabled={idx === 0}
                            aria-label="Nach oben"
                          >
                            <GripVertical className="h-4 w-4 rotate-90" />
                          </button>
                          <button
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            onClick={() => moveLessonDown(idx)}
                            disabled={idx === moduleDetail.lessons.length - 1}
                            aria-label="Nach unten"
                          >
                            <GripVertical className="h-4 w-4 -rotate-90" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">{lesson.title}</span>
                          <p className="text-xs text-muted-foreground truncate max-w-md">
                            {lesson.contentMd.substring(0, 100)}
                            {lesson.contentMd.length > 100 ? "..." : ""}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingLessonId(lesson.id)}
                        >
                          Bearbeiten
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {creatingLesson ? (
                  <LessonEditor
                    lesson={null}
                    moduleId={moduleDetail.id}
                    isNew
                    onSaved={handleLessonSaved}
                    onCancel={() => setCreatingLesson(false)}
                  />
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setCreatingLesson(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Lektion
                  </Button>
                )}
              </TabsContent>

              {/* Materials tab */}
              <TabsContent value="materials">
                <MaterialManager
                  moduleId={moduleDetail.id}
                  materials={moduleDetail.materials}
                  onUpdated={handleMaterialUpdated}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Track edit dialog */}
      <Dialog
        open={editingTrackId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTrackId(null)
            setTrackForm(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lernpfad bearbeiten</DialogTitle>
            <DialogDescription>
              Stufe, Kategorie und Ziel-Rolle des Lernpfads festlegen.
            </DialogDescription>
          </DialogHeader>
          {trackForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="track-name">Name</Label>
                <Input
                  id="track-name"
                  value={trackForm.name}
                  onChange={(e) =>
                    setTrackForm((prev) =>
                      prev ? { ...prev, name: e.target.value } : prev
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-desc">Beschreibung</Label>
                <Textarea
                  id="track-desc"
                  value={trackForm.description}
                  onChange={(e) =>
                    setTrackForm((prev) =>
                      prev ? { ...prev, description: e.target.value } : prev
                    )
                  }
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="track-level">Kompetenz-Stufe</Label>
                  <Select
                    value={trackForm.competenceLevel}
                    onValueChange={(v) =>
                      setTrackForm((prev) =>
                        prev ? { ...prev, competenceLevel: v as CompetenceLevel } : prev
                      )
                    }
                  >
                    <SelectTrigger id="track-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPETENCE_LEVELS.map((lv) => (
                        <SelectItem key={lv} value={lv}>
                          {formatCompetenceLevel(lv)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="track-cat">Kategorie</Label>
                  <Select
                    value={trackForm.category}
                    onValueChange={(v) =>
                      setTrackForm((prev) =>
                        prev ? { ...prev, category: v as TrackCategory } : prev
                      )
                    }
                  >
                    <SelectTrigger id="track-cat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRACK_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {formatTrackCategory(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-brole">BusinessRole</Label>
                <Select
                  value={trackForm.businessRole}
                  onValueChange={(v) =>
                    setTrackForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            businessRole: v as BusinessRole | "__none__",
                          }
                        : prev
                    )
                  }
                >
                  <SelectTrigger id="track-brole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— rollenuebergreifend —</SelectItem>
                    {BUSINESS_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {formatBusinessRole(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingTrackId(null)
                setTrackForm(null)
              }}
              disabled={trackSaving}
            >
              Abbrechen
            </Button>
            <Button onClick={handleSaveTrack} disabled={trackSaving}>
              <Save className="h-4 w-4 mr-2" />
              {trackSaving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
