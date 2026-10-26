import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileSearch,
  FlaskConical,
  Languages,
  ListChecks,
  Lock,
  RotateCcw,
  RotateCw,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AskPanel, type QaEntry } from '@/components/notice/ask-panel'
import { SectionHeading } from '@/components/notice/primitives'
import { ChecklistPanel, FactsPanel, SummaryPanel } from '@/components/notice/results'
import { LanguageControls, ReviewSource, type SourceOrigin } from '@/components/notice/review-source'
import { SourceInput } from '@/components/notice/source-input'
import { ApiClientError, analyzeNotice, askQuestion } from '@/lib/api'
import { extractFromFile, type Progress } from '@/lib/extract'
import {
  DEMO_NOTICE,
  FIELDS,
  type Analysis,
  type ApiErrorKind,
  type FieldKey,
  type LanguageCode,
  type ReadingLevel,
} from '@/lib/notice'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: Home,
})

const DEMO_FEE_QUESTION = 'What is the application fee?'
type AnalysisError = { message: string; kind: ApiErrorKind | 'network' }
const cacheKey = (lang: LanguageCode, level: ReadingLevel) => `${lang}:${level}`

function Home() {
  const [sourceText, setSourceText] = useState<string | null>(null)
  const [origin, setOrigin] = useState<SourceOrigin>({ kind: 'paste' })
  const [reviewed, setReviewed] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)

  const [language, setLanguage] = useState<LanguageCode>('en')
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>('simple')
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({})
  const [analyzedText, setAnalyzedText] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<AnalysisError | null>(null)
  const [modelId, setModelId] = useState<string | null>(null)

  const [confirmations, setConfirmations] = useState<Partial<Record<FieldKey, string>>>({})
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [qa, setQa] = useState<QaEntry[]>([])
  const qaId = useRef(0)
  const resultsRef = useRef<HTMLHeadingElement>(null)
  const requestId = useRef(0)

  const lowConfidenceWords = origin.kind === 'file' ? origin.extraction.lowConfidenceWords : []
  const analysis = analyses[cacheKey(language, readingLevel)]
  const stale = analysis !== undefined && sourceText !== analyzedText

  const reset = () => {
    requestId.current++
    setSourceText(null)
    setOrigin({ kind: 'paste' })
    setReviewed(false)
    setInputError(null)
    setAnalyses({})
    setAnalyzedText(null)
    setAnalyzing(false)
    setAnalysisError(null)
    setConfirmations({})
    setDone({})
    setQa([])
  }

  const loadSource = (text: string, o: SourceOrigin) => {
    reset()
    setSourceText(text)
    setOrigin(o)
  }

  const runAnalysis = useCallback(
    async (lang: LanguageCode, level: ReadingLevel, text: string, freshText: boolean) => {
      const id = ++requestId.current
      setAnalyzing(true)
      setAnalysisError(null)
      try {
        const res = await analyzeNotice({ sourceText: text, language: lang, readingLevel: level, lowConfidenceWords, confirmations })
        if (id !== requestId.current) return
        setModelId(res.model)
        setAnalyses((prev) => ({ ...(freshText ? {} : prev), [cacheKey(lang, level)]: res.analysis }))
        if (freshText) {
          setAnalyzedText(text)
          setDone({})
          setQa([])
          requestAnimationFrame(() => resultsRef.current?.focus())
        }
      } catch (err) {
        if (id !== requestId.current) return
        const e = err instanceof ApiClientError ? err : new ApiClientError('Something went wrong. Please try again.', 'model_unavailable')
        setAnalysisError({ message: e.message, kind: e.kind })
      } finally {
        if (id === requestId.current) setAnalyzing(false)
      }
    },
    [lowConfidenceWords, confirmations],
  )

  // Switching language or reading level re-uses the confirmed text; no re-upload needed.
  useEffect(() => {
    if (!analyzedText || sourceText !== analyzedText) return
    if (!analyses[cacheKey(language, readingLevel)]) void runAnalysis(language, readingLevel, analyzedText, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readingLevel])

  const onAnalyze = () => {
    if (!sourceText) return
    void runAnalysis(language, readingLevel, sourceText, sourceText !== analyzedText)
  }

  const onFile = async (file: File, hindiOcr: boolean) => {
    setInputError(null)
    setExtracting(true)
    setProgress({ label: 'Preparing…', value: 0 })
    try {
      const extraction = await extractFromFile(file, { hindi: hindiOcr, onProgress: setProgress })
      loadSource(extraction.text, { kind: 'file', name: file.name, extraction })
      toast.success('Text extracted. Please check it before analyzing.')
    } catch (err) {
      setInputError(err instanceof Error ? err.message : 'The file could not be read. Try another file or paste the text.')
    } finally {
      setExtracting(false)
      setProgress(null)
    }
  }

  const onConfirm = (key: FieldKey, value: string) => {
    setConfirmations((prev) => ({ ...prev, [key]: value }))
    setAnalyses((prev) => {
      const next: Record<string, Analysis> = {}
      for (const [k, a] of Object.entries(prev)) {
        next[k] = {
          ...a,
          facts: { ...a.facts, [key]: { ...a.facts[key], value, status: 'user_confirmed', note: null } },
        }
      }
      return next
    })
    toast.success(`${FIELDS.find((f) => f.key === key)?.label} confirmed`)
  }

  const ask = async (entryId: number, question: string, lang: LanguageCode) => {
    if (!analyzedText) return
    const history = qa
      .filter((e) => e.answer && e.id !== entryId)
      .slice(-4)
      .map((e) => ({ question: e.question, answer: e.answer!.answer }))
    try {
      const res = await askQuestion({ sourceText: analyzedText, language: lang, question, confirmations, history })
      setQa((prev) => prev.map((e) => (e.id === entryId ? { ...e, pending: false, answer: res.answer, error: undefined } : e)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The question could not be answered.'
      setQa((prev) => prev.map((e) => (e.id === entryId ? { ...e, pending: false, error: message } : e)))
    }
  }

  const onAsk = (question: string) => {
    const id = ++qaId.current
    setQa((prev) => [...prev, { id, question, language, pending: true }])
    void ask(id, question, language)
  }

  const onRetryQuestion = (id: number) => {
    const entry = qa.find((e) => e.id === id)
    if (!entry) return
    setQa((prev) => prev.map((e) => (e.id === id ? { ...e, pending: true, error: undefined } : e)))
    void ask(id, entry.question, entry.language)
  }

  const isDemo = origin.kind === 'demo'
  const hasAnyAnalysis = Object.keys(analyses).length > 0
  const feeEntry = qa.find((e) => e.question === DEMO_FEE_QUESTION)

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-4 focus:py-2">
        Skip to main content
      </a>
      <Header onReset={sourceText !== null ? reset : undefined} modelId={modelId} />

      <main id="main" className="mx-auto max-w-content px-4 pb-16 sm:px-6">
        {sourceText === null ? <Intro /> : <h1 className="sr-only">Notice-to-Action Accessibility Assistant</h1>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <div className="min-w-0 space-y-6">
            {sourceText === null ? (
              <section aria-labelledby="step-1" className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
                <SectionHeading step={1} title="Add your notice" id="step-1" />
                <p className="mt-1 mb-5 text-muted-foreground">Upload a photo, screenshot or PDF of the notice, or paste its text.</p>
                {inputError && (
                  <Alert variant="destructive" className="mb-4" role="alert">
                    <AlertTriangle aria-hidden="true" />
                    <AlertTitle>That file could not be used</AlertTitle>
                    <AlertDescription>{inputError}</AlertDescription>
                  </Alert>
                )}
                <SourceInput
                  busy={extracting}
                  progress={progress}
                  onFile={onFile}
                  onPaste={(text) => loadSource(text.trim(), { kind: 'paste' })}
                  onDemo={() => loadSource(DEMO_NOTICE, { kind: 'demo' })}
                  onError={setInputError}
                />
              </section>
            ) : (
              <section aria-labelledby="step-2" className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
                <SectionHeading step={2} title="Check the text and choose how to explain it" id="step-2" />
                <div className="mt-5">
                  <ReviewSource
                    text={sourceText}
                    origin={origin}
                    reviewed={reviewed}
                    analyzing={analyzing}
                    hasResults={hasAnyAnalysis}
                    onText={setSourceText}
                    onReviewed={setReviewed}
                    onAnalyze={onAnalyze}
                    controls={
                      <LanguageControls
                        language={language}
                        readingLevel={readingLevel}
                        onLanguage={setLanguage}
                        onReadingLevel={setReadingLevel}
                      />
                    }
                  />
                </div>
              </section>
            )}

            {(hasAnyAnalysis || analyzing || analysisError) && (
              <section aria-labelledby="step-3" className="space-y-5">
                <h2
                  id="step-3"
                  ref={resultsRef}
                  tabIndex={-1}
                  className="flex items-center gap-3 text-xl font-bold outline-none sm:text-2xl"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-sans text-base text-primary-foreground" aria-hidden="true">
                    3
                  </span>
                  Understand the notice and act
                </h2>

                {stale && !analyzing && (
                  <Alert role="status">
                    <AlertTriangle aria-hidden="true" />
                    <AlertTitle>The notice text has changed</AlertTitle>
                    <AlertDescription>
                      These results are for the earlier text. Select “Re-analyze notice” to update them.
                    </AlertDescription>
                  </Alert>
                )}

                {analysisError && !analyzing && (
                  <AnalysisErrorAlert error={analysisError} onRetry={onAnalyze} />
                )}

                {analyzing && <ResultsSkeleton />}

                {!analysis && !analyzing && !analysisError && (
                  <p className="rounded-lg border bg-card p-4">Select “Re-analyze notice” to see results for these settings.</p>
                )}

                {analysis && !analyzing && (
                  <>
                    <SummaryPanel analysis={analysis} language={language} />
                    <ChecklistPanel
                      analysis={analysis}
                      language={language}
                      done={done}
                      onToggle={(id, v) => setDone((prev) => ({ ...prev, [id]: v }))}
                      onReset={() => setDone({})}
                    />
                    <FactsPanel analysis={analysis} language={language} onConfirm={onConfirm} />
                    {analysis.validation_notes.length > 0 && (
                      <details className="rounded-lg border bg-card p-4 text-[0.95rem]">
                        <summary className="cursor-pointer font-semibold">
                          Accuracy checks adjusted {analysis.validation_notes.length} item
                          {analysis.validation_notes.length === 1 ? '' : 's'}
                        </summary>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                          {analysis.validation_notes.map((n) => (
                            <li key={n}>{n}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </>
                )}
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-4" aria-label="Questions and help">
            <AskPanel
              entries={qa}
              enabled={!!analyzedText && hasAnyAnalysis && !stale}
              highlight={isDemo ? DEMO_FEE_QUESTION : undefined}
              onAsk={onAsk}
              onRetry={onRetryQuestion}
            />
            {isDemo && (
              <DemoGuide
                steps={[
                  { label: 'Load the sample notice', done: true },
                  { label: 'View the extracted source text', done: true },
                  { label: 'Generate structured fields', done: hasAnyAnalysis },
                  { label: 'Read the English summary and checklist', done: Object.keys(analyses).some((k) => k.startsWith('en:')) },
                  { label: 'Switch to Hindi', done: Object.keys(analyses).some((k) => k.startsWith('hi:')) },
                  { label: `Ask “${DEMO_FEE_QUESTION}”`, done: !!feeEntry },
                  { label: 'See that the fee is not stated', done: feeEntry?.answer?.answer_type === 'not_stated' },
                ]}
              />
            )}
            <PrivacyNote />
          </aside>
        </div>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-content flex-col gap-1 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <p>
            Notice-to-Action Accessibility Assistant explains notices; it is not legal or official advice. Always check
            important details with the issuing organization.
          </p>
        </div>
      </footer>
    </div>
  )
}

function Header({ onReset, modelId }: { onReset?: () => void; modelId: string | null }) {
  return (
    <header className="border-b-4 border-saffron bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-foreground text-primary" aria-hidden="true">
            <ListChecks className="size-7" />
          </div>
          <div>
            <p className="font-display text-lg leading-tight font-bold sm:text-xl">Notice-to-Action</p>
            <p className="text-sm text-primary-foreground/85">Accessibility Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-primary-foreground/30 px-3 py-1 text-sm sm:inline" title={modelId ?? undefined}>
            Powered by Gemma 4
          </span>
          {onReset && (
            <Button variant="secondary" onClick={onReset}>
              <RotateCcw aria-hidden="true" /> Start again
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

function Intro() {
  const points = [
    { Icon: FileSearch, title: 'Read any notice', text: 'Photos, screenshots, PDFs or pasted text.' },
    { Icon: Languages, title: 'English or Hindi', text: 'Three reading levels, with read-aloud.' },
    { Icon: ListChecks, title: 'Know what to do', text: 'A checklist with deadlines and source quotes.' },
    { Icon: ShieldCheck, title: 'No guessing', text: 'Missing details are clearly marked as not stated.' },
  ]
  return (
    <section className="py-8 sm:py-12" aria-labelledby="page-title">
      <h1 id="page-title" className="max-w-3xl text-4xl leading-tight font-bold sm:text-5xl">
        Notice-to-Action Accessibility Assistant
      </h1>
      <p className="mt-3 text-xl text-muted-foreground sm:text-2xl">Understand the notice. Know what to do next.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {points.map(({ Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <Icon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-bold">{title}</p>
              <p className="text-[0.95rem] text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AnalysisErrorAlert({ error, onRetry }: { error: AnalysisError; onRetry: () => void }) {
  const setupHelp = error.kind === 'model_unavailable' || error.kind === 'config'
  return (
    <Alert variant="destructive" role="alert">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle>The notice was not analyzed</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{error.message}</p>
        {setupHelp && (
          <p className="text-foreground">
            This app uses Gemma 4 (no other model is substituted). If this keeps happening, see “Model setup” in the
            README. You can still edit the text above and try again.
          </p>
        )}
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RotateCw aria-hidden="true" /> Try again
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Gemma 4 is analyzing the notice. This usually takes 10 to 30 seconds.</span>
      <div className="rounded-xl border bg-card p-6">
        <p className="mb-4 font-semibold text-muted-foreground" aria-hidden="true">
          Gemma 4 is reading the notice… this usually takes 10–30 seconds.
        </p>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-5 w-full" />
        <Skeleton className="mt-2 h-5 w-5/6" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="h-6 w-48" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="mt-3 h-16 w-full" />
        ))}
      </div>
    </div>
  )
}

function DemoGuide({ steps }: { steps: { label: string; done: boolean }[] }) {
  return (
    <section aria-labelledby="demo-guide" className="rounded-xl border border-accent-foreground/20 bg-accent/50 p-4 sm:p-5">
      <h2 id="demo-guide" className="flex items-center gap-2 text-lg font-bold text-accent-foreground">
        <FlaskConical className="size-5" aria-hidden="true" /> Demo walkthrough
      </h2>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={s.label} className={cn('flex items-start gap-2', s.done ? 'text-foreground' : 'text-muted-foreground')}>
            {s.done ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-status-stated" aria-hidden="true" />
            ) : (
              <Circle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            )}
            <span>
              {i + 1}. {s.label}
              <span className="sr-only">{s.done ? ' (done)' : ' (not yet)'}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function PrivacyNote() {
  return (
    <section aria-labelledby="privacy" className="rounded-xl border bg-card p-4 text-[0.95rem] sm:p-5">
      <h2 id="privacy" className="flex items-center gap-2 text-lg font-bold">
        <Lock className="size-5 text-primary" aria-hidden="true" /> Your privacy
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>Files are read on your device. Images and PDFs are never uploaded.</li>
        <li>
          Only the text you confirm is sent to Google’s Gemma 4 model through Netlify AI Gateway and a third-party inference
          provider for analysis.
        </li>
        <li>Notices and answers are not saved. Closing or resetting the page clears them.</li>
        <li>Avoid including personal details you don’t need explained.</li>
      </ul>
    </section>
  )
}
