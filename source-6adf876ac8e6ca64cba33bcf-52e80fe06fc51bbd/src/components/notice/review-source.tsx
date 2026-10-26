import { AlertTriangle, FlaskConical, Loader2, ScanText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Segmented } from '@/components/notice/primitives'
import type { ExtractionResult } from '@/lib/extract'
import {
  LANGUAGES,
  MAX_SOURCE_CHARS,
  READING_LEVELS,
  type LanguageCode,
  type ReadingLevel,
} from '@/lib/notice'

export type SourceOrigin = { kind: 'demo' } | { kind: 'paste' } | { kind: 'file'; name: string; extraction: ExtractionResult }

const METHOD_LABEL = {
  ocr: 'Scanned with OCR (Tesseract.js)',
  'pdf-text': 'Read from the PDF text layer (PDF.js)',
  'pdf-ocr': 'Scanned PDF pages read with OCR',
} as const

export function LanguageControls({
  language,
  readingLevel,
  onLanguage,
  onReadingLevel,
  disabled,
}: {
  language: LanguageCode
  readingLevel: ReadingLevel
  onLanguage: (l: LanguageCode) => void
  onReadingLevel: (l: ReadingLevel) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
      <Segmented
        legend="Explain in"
        name="language"
        value={language}
        onChange={onLanguage}
        disabled={disabled}
        options={LANGUAGES.map((l) => ({
          value: l.code,
          label: l.code === 'en' ? l.label : `${l.nativeLabel} · ${l.label}`,
          lang: l.code,
        }))}
      />
      <Segmented
        legend="Reading level"
        name="reading-level"
        value={readingLevel}
        onChange={onReadingLevel}
        disabled={disabled}
        options={READING_LEVELS.map((l) => ({ value: l.id, label: l.label, hint: l.hint }))}
      />
    </div>
  )
}

export function ReviewSource({
  text,
  origin,
  reviewed,
  analyzing,
  hasResults,
  onText,
  onReviewed,
  onAnalyze,
  controls,
}: {
  text: string
  origin: SourceOrigin
  reviewed: boolean
  analyzing: boolean
  hasResults: boolean
  onText: (t: string) => void
  onReviewed: (v: boolean) => void
  onAnalyze: () => void
  controls: React.ReactNode
}) {
  const extraction = origin.kind === 'file' ? origin.extraction : null
  const lowConfidence = extraction?.lowConfidenceWords ?? []
  const needsReview = extraction?.confidence != null
  const canAnalyze = text.trim().length >= 20 && (!needsReview || reviewed) && !analyzing

  return (
    <div className="space-y-5">
      {origin.kind === 'demo' && (
        <p className="flex items-start gap-2 rounded-md border border-accent-foreground/20 bg-accent/60 px-3 py-2 text-[0.95rem] text-accent-foreground">
          <FlaskConical className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>
            <strong>Synthetic demonstration notice.</strong> It was written for this demo and is not an actual university
            announcement. It is analyzed by the same Gemma 4 pipeline as any uploaded notice.
          </span>
        </p>
      )}

      {extraction && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.95rem]">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <ScanText className="size-5 text-primary" aria-hidden="true" />
            {METHOD_LABEL[extraction.method]}
          </span>
          <span className="text-muted-foreground">{origin.kind === 'file' && origin.name}</span>
          {extraction.confidence != null && (
            <span className={extraction.confidence < 80 ? 'font-semibold text-status-uncertain' : 'text-muted-foreground'}>
              Average OCR confidence: {extraction.confidence}%
            </span>
          )}
          {!!extraction.skippedPages && (
            <span className="text-status-uncertain font-semibold">
              Only the first {extraction.pages} pages were read ({extraction.skippedPages} skipped).
            </span>
          )}
        </div>
      )}

      {lowConfidence.length > 0 && (
        <div className="rounded-md border border-status-uncertain/40 bg-status-uncertain-bg p-3" role="note">
          <p className="flex items-center gap-2 font-semibold text-status-uncertain">
            <AlertTriangle className="size-5" aria-hidden="true" />
            {lowConfidence.length} word{lowConfidence.length === 1 ? ' was' : 's were'} hard to read. Please check them below.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Words read with low confidence">
            {lowConfidence.slice(0, 40).map((w) => (
              <li key={w} className="rounded border border-status-uncertain/40 bg-card px-1.5 font-mono text-sm">
                {w}
              </li>
            ))}
            {lowConfidence.length > 40 && <li className="text-sm">+{lowConfidence.length - 40} more</li>}
          </ul>
          <p className="mt-2 text-sm text-foreground">Facts that rely on these words are marked “Needs checking” until you confirm them.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="source-text" className="text-[0.95rem] font-bold">
          Notice text — check it and correct any mistakes
        </Label>
        <Textarea
          id="source-text"
          value={text}
          onChange={(e) => onText(e.target.value)}
          maxLength={MAX_SOURCE_CHARS}
          rows={12}
          className="bg-card font-mono text-[0.95rem] leading-relaxed"
        />
        <p className="text-sm text-muted-foreground">
          Only this text is sent for analysis. Editing it after analysis lets you re-run with your corrections.
        </p>
      </div>

      {needsReview && (
        <div className="flex items-start gap-2.5">
          <Checkbox id="reviewed" checked={reviewed} onCheckedChange={(v) => onReviewed(v === true)} className="mt-1" />
          <Label htmlFor="reviewed" className="text-[0.95rem] leading-snug font-normal">
            I have checked the scanned text against the original notice.
          </Label>
        </div>
      )}

      {controls}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={onAnalyze} disabled={!canAnalyze} className="min-w-48 text-base">
          {analyzing ? (
            <>
              <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Analyzing with Gemma 4…
            </>
          ) : (
            <>
              <Sparkles aria-hidden="true" /> {hasResults ? 'Re-analyze notice' : 'Analyze Notice'}
            </>
          )}
        </Button>
        {needsReview && !reviewed && (
          <span className="text-sm text-muted-foreground">Confirm you have checked the text to continue.</span>
        )}
      </div>
    </div>
  )
}
