"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  listPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from "@/lib/actions/prompts"
import {
  formatBusinessRole,
  formatTool,
} from "@/lib/utils"
import { TOOL_LIST } from "@/lib/tool-constants"
import { toast } from "@/hooks/use-toast"
import { Plus, Copy, Pencil, Trash2 } from "lucide-react"
import type { BusinessRole, Tool } from "@prisma/client"

type Prompt = Awaited<ReturnType<typeof listPrompts>>[number]

const BUSINESS_ROLES: BusinessRole[] = [
  "VERTRIEB",
  "PRODUKTION",
  "VERWALTUNG",
  "IT",
  "HR",
  "FUEHRUNG",
]

export function PromptsClient({
  initial,
  canEdit,
}: {
  initial: Prompt[]
  canEdit: boolean
}) {
  const [prompts, setPrompts] = useState<Prompt[]>(initial)
  const [filterRole, setFilterRole] = useState<BusinessRole | "ALL">("ALL")
  const [filterTool, setFilterTool] = useState<Tool | "ALL">("ALL")
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [businessRole, setBusinessRole] = useState<BusinessRole | "__none__">("__none__")
  const [tool, setTool] = useState<Tool | "__none__">("__none__")
  const [tagsInput, setTagsInput] = useState("")
  const [isPending, startTransition] = useTransition()

  function reload(role = filterRole, t = filterTool) {
    startTransition(async () => {
      const data = await listPrompts({ businessRole: role, tool: t })
      setPrompts(data)
    })
  }

  function resetForm() {
    setEditingId(null)
    setTitle("")
    setBody("")
    setBusinessRole("__none__")
    setTool("__none__")
    setTagsInput("")
  }

  function openNew() {
    resetForm()
    setOpen(true)
  }

  function openEdit(p: Prompt) {
    setEditingId(p.id)
    setTitle(p.title)
    setBody(p.body)
    setBusinessRole(p.businessRole ?? "__none__")
    setTool(p.tool ?? "__none__")
    setTagsInput(p.tags.join(", "))
    setOpen(true)
  }

  function handleSave() {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    startTransition(async () => {
      const payload = {
        title,
        body,
        businessRole:
          businessRole === "__none__" ? null : (businessRole as BusinessRole),
        tool: tool === "__none__" ? null : (tool as Tool),
        tags,
      }
      const res = editingId
        ? await updatePrompt(editingId, payload)
        : await createPrompt(payload)
      if (!res.success) {
        toast({ title: "Fehler", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: editingId ? "Aktualisiert" : "Angelegt" })
      setOpen(false)
      resetForm()
      reload()
    })
  }

  function handleDelete(id: string) {
    if (!confirm("Prompt loeschen?")) return
    startTransition(async () => {
      await deletePrompt(id)
      reload()
    })
  }

  function handleCopy(text: string) {
    void navigator.clipboard?.writeText(text)
    toast({ title: "In Zwischenablage kopiert" })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={filterRole}
          onValueChange={(v) => {
            const next = v as BusinessRole | "ALL"
            setFilterRole(next)
            reload(next, filterTool)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Rolle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Rollen</SelectItem>
            {BUSINESS_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {formatBusinessRole(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterTool}
          onValueChange={(v) => {
            const next = v as Tool | "ALL"
            setFilterTool(next)
            reload(filterRole, next)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tool" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Tools</SelectItem>
            {TOOL_LIST.map((t) => (
              <SelectItem key={t} value={t}>
                {formatTool(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{prompts.length}</span>
        {canEdit && (
          <Button className="ml-auto" size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Neuer Prompt
          </Button>
        )}
      </div>

      {prompts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Prompts in dieser Auswahl.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {prompts.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">{p.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleCopy(p.body)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.businessRole && (
                    <Badge variant="outline" className="text-[10px]">
                      {formatBusinessRole(p.businessRole)}
                    </Badge>
                  )}
                  {p.tool && (
                    <Badge variant="outline" className="text-[10px]">
                      {formatTool(p.tool)}
                    </Badge>
                  )}
                  {p.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">
                      #{t}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-muted/40 p-2 rounded max-h-60 overflow-auto font-mono">
                  {p.body}
                </pre>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {p.authorName} · {new Date(p.updatedAt).toLocaleDateString("de-DE")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Prompt bearbeiten" : "Neuer Prompt"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="p-title">Titel</Label>
              <Input
                id="p-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-body">Prompt-Text</Label>
              <Textarea
                id="p-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[160px] font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-role">BusinessRole</Label>
                <Select
                  value={businessRole}
                  onValueChange={(v) => setBusinessRole(v as BusinessRole | "__none__")}
                >
                  <SelectTrigger id="p-role">
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
              <div className="space-y-1">
                <Label htmlFor="p-tool">Tool</Label>
                <Select
                  value={tool}
                  onValueChange={(v) => setTool(v as Tool | "__none__")}
                >
                  <SelectTrigger id="p-tool">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— tool-unabhaengig —</SelectItem>
                    {TOOL_LIST.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatTool(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-tags">Tags (Komma-getrennt)</Label>
              <Input
                id="p-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                resetForm()
              }}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Sende..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
