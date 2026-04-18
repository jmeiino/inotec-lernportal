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
import { createImpactStory, listImpactStories } from "@/lib/actions/impact"
import { toast } from "@/hooks/use-toast"
import { formatBusinessRole } from "@/lib/utils"
import { Plus, Sparkles, TrendingUp } from "lucide-react"

type Stories = Awaited<ReturnType<typeof listImpactStories>>

export function ImpactClient({ initial }: { initial: Stories }) {
  const [stories, setStories] = useState<Stories>(initial)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [problem, setProblem] = useState("")
  const [solution, setSolution] = useState("")
  const [metric, setMetric] = useState("")
  const [tags, setTags] = useState("")
  const [isPending, startTransition] = useTransition()

  function resetForm() {
    setTitle("")
    setProblem("")
    setSolution("")
    setMetric("")
    setTags("")
  }

  function handleSave() {
    startTransition(async () => {
      const res = await createImpactStory({
        title,
        problem,
        solution,
        metric: metric || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      })
      if (!res.success) {
        toast({ title: "Fehler", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Story veroeffentlicht" })
      setOpen(false)
      resetForm()
      const refreshed = await listImpactStories()
      setStories(refreshed)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Neue Story
        </Button>
      </div>

      {stories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">
              Noch keine Impact-Stories. Sein Sie die/der Erste!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {stories.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {s.title}
                </CardTitle>
                {s.metric && (
                  <Badge className="w-fit mt-1" variant="success">
                    {s.metric}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-semibold">Problem:</span>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {s.problem}
                  </p>
                </div>
                <div>
                  <span className="font-semibold">Loesung:</span>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {s.solution}
                  </p>
                </div>
                {s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                  <span>
                    {s.author?.name ?? "—"}
                    {s.author?.department && ` · ${s.author.department}`}
                    {s.author?.businessRole && ` · ${formatBusinessRole(s.author.businessRole)}`}
                  </span>
                  <span>
                    {s.publishedAt
                      ? new Date(s.publishedAt).toLocaleDateString("de-DE")
                      : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Impact-Story teilen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="imp-title">Titel</Label>
              <Input
                id="imp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Angebotsprozess um 40 % verkuerzt"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="imp-problem">Problem</Label>
              <Textarea
                id="imp-problem"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="min-h-[70px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="imp-solution">Loesung</Label>
              <Textarea
                id="imp-solution"
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                className="min-h-[70px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="imp-metric">Messergebnis (optional)</Label>
              <Input
                id="imp-metric"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder="z. B. -40 % Bearbeitungszeit"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="imp-tags">Tags (Komma-getrennt)</Label>
              <Input
                id="imp-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="vertrieb, copilot, automatisierung"
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
              {isPending ? "Sende..." : "Veroeffentlichen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
