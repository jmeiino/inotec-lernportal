"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { deleteMaterial } from "@/lib/actions/courses"
import { Trash2, Upload } from "lucide-react"

interface MaterialData {
  id: string
  title: string
  type: string
  filePath: string
  fileSize: number | null
  sortOrder: number
}

interface MaterialManagerProps {
  moduleId: string
  materials: MaterialData[]
  onUpdated: () => void
}

const typeLabels: Record<string, string> = {
  HANDOUT: "Handout",
  PRESENTATION: "Präsentation",
  CHEATSHEET: "Cheatsheet",
  OTHER: "Sonstiges",
}

const typeVariants: Record<string, "default" | "secondary" | "outline"> = {
  HANDOUT: "default",
  PRESENTATION: "secondary",
  CHEATSHEET: "outline",
  OTHER: "outline",
}

export function MaterialManager({ moduleId, materials, onUpdated }: MaterialManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState("HANDOUT")
  const [file, setFile] = useState<File | null>(null)

  async function handleUpload() {
    if (!file || !title.trim()) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title)
      formData.append("type", type)
      formData.append("moduleId", moduleId)

      const res = await fetch("/api/materials/upload", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        setTitle("")
        setFile(null)
        setType("HANDOUT")
        onUpdated()
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(materialId: string) {
    if (!confirm("Material wirklich löschen?")) return
    await deleteMaterial(materialId)
    onUpdated()
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "-"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Existing materials */}
      {materials.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Größe</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.title}</TableCell>
                <TableCell>
                  <Badge variant={typeVariants[m.type] ?? "outline"}>
                    {typeLabels[m.type] ?? m.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatSize(m.fileSize)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(m.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">Keine Materialien vorhanden.</p>
      )}

      {/* Upload form */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium">Neues Material hochladen</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="mat-title">Titel</Label>
            <Input
              id="mat-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Materialtitel"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mat-type">Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="mat-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HANDOUT">Handout</SelectItem>
                <SelectItem value="PRESENTATION">Präsentation</SelectItem>
                <SelectItem value="CHEATSHEET">Cheatsheet</SelectItem>
                <SelectItem value="OTHER">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="mat-file">Datei</Label>
            <Input
              id="mat-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <Button
          onClick={handleUpload}
          disabled={uploading || !file || !title.trim()}
          size="sm"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Hochladen..." : "Hochladen"}
        </Button>
      </div>
    </div>
  )
}
