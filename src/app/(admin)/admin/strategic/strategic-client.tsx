"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createStrategicDecision,
  setStrategicDecisionStatus,
  getStrategicOverview,
} from "@/lib/actions/strategic"
import { formatCompetenceLevel } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { Plus, Sparkles } from "lucide-react"

type Data = Awaited<ReturnType<typeof getStrategicOverview>>

const STATUSES = ["OPEN", "IN_PROGRESS", "DONE", "DROPPED"]

export function StrategicClient({
  data,
  isAdmin,
}: {
  data: Data
  isAdmin: boolean
}) {
  const [snapshot, setSnapshot] = useState<Data>(data)
  const [open, setOpen] = useState(false)
  const [reviewDate, setReviewDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [topic, setTopic] = useState("")
  const [decision, setDecision] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [isPending, startTransition] = useTransition()

  function reload() {
    startTransition(async () => {
      const fresh = await getStrategicOverview()
      setSnapshot(fresh)
    })
  }

  function handleCreate() {
    startTransition(async () => {
      const res = await createStrategicDecision({
        reviewDate,
        topic,
        decision,
        dueDate: dueDate || null,
      })
      if (!res.success) {
        toast({
          title: "Fehler",
          description: res.error,
          variant: "destructive",
        })
        return
      }
      toast({ title: "Entscheidung gespeichert" })
      setTopic("")
      setDecision("")
      setDueDate("")
      setOpen(false)
      reload()
    })
  }

  function handleStatus(id: string, status: string) {
    startTransition(async () => {
      await setStrategicDecisionStatus(id, status)
      reload()
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Mitarbeitende gesamt
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {snapshot.totalUsers}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Approved Arbeitsprodukte (gesamt)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {snapshot.submissionStats.approvedTotal}
            </div>
            <div className="text-xs text-muted-foreground">
              {snapshot.submissionStats.approvedLast30Days} in den letzten 30 Tagen
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Ø Review-Durchlaufzeit
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {snapshot.submissionStats.avgDurationDays !== null
              ? `${snapshot.submissionStats.avgDurationDays.toFixed(1)} Tage`
              : "—"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fach-Pyramide (Reichweite)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshot.fachPyramid.map((p) => (
              <div key={p.level} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{formatCompetenceLevel(p.level)}</span>
                  <span className="text-muted-foreground">
                    {p.reachedUsers} ({p.reachedPct}%)
                  </span>
                </div>
                <Progress value={p.reachedPct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fuehrungs-Pyramide (Reichweite)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshot.fuehrungPyramid.map((p) => (
              <div key={p.level} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{formatCompetenceLevel(p.level)}</span>
                  <span className="text-muted-foreground">
                    {p.reachedUsers} ({p.reachedPct}%)
                  </span>
                </div>
                <Progress value={p.reachedPct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {snapshot.surveySelfByLevel.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Selbsteinschaetzung pro Stufe (Befragungen)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {snapshot.surveySelfByLevel.map((s) => (
                <Badge key={s.level} variant="outline">
                  {formatCompetenceLevel(s.level)}: {s.n}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Strategische Entscheidungen</CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Neue Entscheidung
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {snapshot.decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Noch keine Entscheidungen erfasst.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Review-Datum</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Entscheidung</TableHead>
                  <TableHead>Faellig</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.decisions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm">
                      {new Date(d.reviewDate).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{d.topic}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md">
                      {d.decision}
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.dueDate
                        ? new Date(d.dueDate).toLocaleDateString("de-DE")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Select
                          value={d.status}
                          onValueChange={(v) => handleStatus(d.id, v)}
                        >
                          <SelectTrigger className="w-32 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{d.status}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Strategische Entscheidung erfassen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="sd-date">Review-Datum</Label>
              <Input
                id="sd-date"
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sd-topic">Thema</Label>
              <Input
                id="sd-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sd-decision">Entscheidung</Label>
              <Textarea
                id="sd-decision"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sd-due">Faellig (optional)</Label>
              <Input
                id="sd-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? "Sende..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
