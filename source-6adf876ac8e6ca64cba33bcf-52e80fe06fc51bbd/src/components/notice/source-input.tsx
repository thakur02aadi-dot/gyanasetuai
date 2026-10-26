import { useRef, useState } from 'react'
import { ClipboardPaste, FileText, FlaskConical, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ACCEPT_ATTR, MAX_PDF_PAGES, validateFile, type Progress as ExtractProgress } from '@/lib/extract'
import { MAX_SOURCE_CHARS } from '@/lib/notice'

export function SourceInput({
  busy,
  progress,
  onFile,
  onPaste,
  onDemo,
  onError,
}: {
  busy: boolean
  progress: ExtractProgress | null
  onFile: (file: File, hindiOcr: boolean) => void
  onPaste: (text: string) => void
  onDemo: () => void
  onError: (message: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [hindiOcr, setHindiOcr] = useState(false)
  const [pasted, setPasted] = useState('')

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const problem = validateFile(file)
    if (problem) return onError(problem)
    onFile(file, hindiOcr)
  }

  return (
    <div className="space-y-5">
      <Tabs defaultValue="upload">
        <TabsList className="h-auto w-full sm:w-fit">
          <TabsTrigger value="upload" className="px-4 py-2 text-[0.95rem]">
            <Upload aria-hidden="true" /> Upload a file
          </TabsTrigger>
          <TabsTrigger value="paste" className="px-4 py-2 text-[0.95rem]">
            <ClipboardPaste aria-hidden="true" /> Paste text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3 space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              if (!busy) setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              if (!busy) handleFiles(e.dataTransfer.files)
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors motion-reduce:transition-none',
              dragging ? 'border-primary bg-secondary' : 'border-input bg-card',
            )}
          >
            {busy && progress ? (
              <div className="w-full max-w-sm space-y-3" role="status" aria-live="polite">
                <Loader2 className="mx-auto size-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                <p className="font-semibold">{progress.label}</p>
                <Progress value={Math.round(progress.value * 100)} aria-label="Text extraction progress" />
                <p className="text-sm text-muted-foreground">This runs on your device. Large scans can take a minute.</p>
              </div>
            ) : (
              <>
                <FileText className="size-10 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-lg font-semibold">Drag and drop a notice here</p>
                  <p className="text-muted-foreground">JPG, PNG or PDF · up to 10 MB · first {MAX_PDF_PAGES} PDF pages</p>
                </div>
                <Button size="lg" onClick={() => inputRef.current?.click()} disabled={busy}>
                  <Upload aria-hidden="true" /> Upload notice
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT_ATTR}
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Choose a notice file"
                  onChange={(e) => {
                    handleFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </>
            )}
          </div>
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="hindi-ocr"
              checked={hindiOcr}
              onCheckedChange={(v) => setHindiOcr(v === true)}
              disabled={busy}
              className="mt-1"
            />
            <Label htmlFor="hindi-ocr" className="text-[0.95rem] leading-snug font-normal">
              The notice contains Hindi (Devanagari) text — improves scanning, but takes longer the first time.
            </Label>
          </div>
        </TabsContent>

        <TabsContent value="paste" className="mt-3 space-y-3">
          <Label htmlFor="paste-text" className="text-[0.95rem] font-bold">
            Paste the notice text
          </Label>
          <Textarea
            id="paste-text"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            maxLength={MAX_SOURCE_CHARS}
            rows={8}
            placeholder="Paste the full text of the notice here…"
            className="bg-card text-base"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {pasted.length.toLocaleString()} / {MAX_SOURCE_CHARS.toLocaleString()} characters
            </span>
            <Button size="lg" onClick={() => onPaste(pasted)} disabled={pasted.trim().length < 20}>
              Use this text
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-3 rounded-lg border border-accent-foreground/15 bg-accent/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-accent-foreground">Try it with a sample</p>
          <p className="text-sm text-accent-foreground/90">
            A synthetic scholarship notice — made up for this demo, not a real announcement.
          </p>
        </div>
        <Button variant="outline" size="lg" onClick={onDemo} disabled={busy} className="shrink-0">
          <FlaskConical aria-hidden="true" /> Load Demo Notice
        </Button>
      </div>
    </div>
  )
}
