import { useState } from 'react'
import { CalendarClock, Check, ListChecks, Pause, Pencil, Play, RotateCcw, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { SourceQuote, StatusBadge } from '@/components/notice/primitives'
import { useSpeech } from '@/hooks/use-speech'
import { t } from '@/lib/i18n'
import { FIELDS, getLanguage, type Analysis, type ChecklistItem, type FieldKey, type LanguageCode } from '@/lib/notice'
import { cn } from '@/lib/utils'

function Panel({ title, icon, children, lang, aside }: { title: string; icon?: React.ReactNode; children: React.ReactNode; lang: string; aside?: React.ReactNode }) {
  return (
    <section lang={lang} className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xl font-bold">
          {icon}
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function ReadAloud({ text, language }: { text: string; language: LanguageCode }) {
  const lang = getLanguage(language)
  const speech = useSpeech(lang.speechLang)
  if (!speech.supported) {
    return <p className="text-sm text-muted-foreground">Read-aloud is not available in this browser.</p>
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Read aloud">
      <Volume2 className="size-5 text-primary" aria-hidden="true" />
      {speech.state === 'idle' && (
        <Button variant="outline" size="sm" onClick={() => speech.play(text)}>
          <Play aria-hidden="true" /> Read aloud
        </Button>
      )}
      {speech.state === 'playing' && (
        <Button variant="outline" size="sm" onClick={speech.pause}>
          <Pause aria-hidden="true" /> Pause
        </Button>
      )}
      {speech.state === 'paused' && (
        <Button variant="outline" size="sm" onClick={speech.resume}>
          <Play aria-hidden="true" /> Resume
        </Button>
      )}
      {speech.state !== 'idle' && (
        <Button variant="outline" size="sm" onClick={speech.stop}>
          <Square aria-hidden="true" /> Stop
        </Button>
      )}
      {!speech.hasVoice && (
        <span className="text-sm text-muted-foreground">No {lang.label} voice found on this device; the default voice is used.</span>
      )}
    </div>
  )
}

export function SummaryPanel({ analysis, language }: { analysis: Analysis; language: LanguageCode }) {
  const s = t(language)
  const speakText = [
    analysis.summary,
    `${s.whatToDo}: ${analysis.what_to_do}`,
    analysis.deadline_text && `${s.deadline}: ${analysis.deadline_text}`,
    analysis.documents_text && `${s.documents}: ${analysis.documents_text}`,
  ]
    .filter(Boolean)
    .join('. ')

  const rows: [string, string | null][] = [
    [s.about, analysis.about],
    [s.appliesTo, analysis.applies_to],
    [s.whatToDo, analysis.what_to_do],
    [s.deadline, analysis.deadline_text],
    [s.documents, analysis.documents_text],
  ]

  return (
    <Panel title={s.summary} lang={language} aside={<ReadAloud text={speakText} language={language} />}>
      <p className="max-w-reading text-lg leading-relaxed sm:text-xl">{analysis.summary}</p>
      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className={cn('mt-0.5', !value && 'text-status-missing italic')}>{value ?? s.notStatedValue}</dd>
          </div>
        ))}
      </dl>
      {analysis.unclear.length > 0 && (
        <div className="mt-5 rounded-md border border-status-uncertain/40 bg-status-uncertain-bg p-3">
          <p className="font-bold text-status-uncertain">{s.unclear}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {analysis.unclear.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

export function FactsPanel({
  analysis,
  language,
  onConfirm,
}: {
  analysis: Analysis
  language: LanguageCode
  onConfirm: (key: FieldKey, value: string) => void
}) {
  const s = t(language)
  const present = FIELDS.filter((f) => analysis.facts[f.key].status !== 'not_stated')
  const missing = FIELDS.filter((f) => analysis.facts[f.key].status === 'not_stated')

  return (
    <Panel title={s.facts} lang={language}>
      <ul className="divide-y">
        {present.map((f) => (
          <FactRow key={f.key} fieldKey={f.key} analysis={analysis} language={language} onConfirm={onConfirm} />
        ))}
      </ul>
      {missing.length > 0 && (
        <div className="mt-5 rounded-md border bg-status-missing-bg p-3">
          <p className="font-bold text-status-missing">{s.missing}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missing.map((f) => (
              <li key={f.key}>
                <StatusBadge status="not_stated" label={s.fields[f.key]} className="bg-card" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

function FactRow({
  fieldKey,
  analysis,
  language,
  onConfirm,
}: {
  fieldKey: FieldKey
  analysis: Analysis
  language: LanguageCode
  onConfirm: (key: FieldKey, value: string) => void
}) {
  const s = t(language)
  const fact = analysis.facts[fieldKey]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(fact.value ?? '')
  const inputId = `correct-${fieldKey}`

  return (
    <li className={cn('py-3.5', fact.status === 'uncertain' && '-mx-2 rounded-md bg-status-uncertain-bg/50 px-2')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-bold">{s.fields[fieldKey]}</p>
        <StatusBadge status={fact.status} label={s.status[fact.status]} />
      </div>
      <p className="mt-1">{fact.display ?? fact.value}</p>
      {language !== 'en' && fact.value && fact.value !== fact.display && (
        <p className="mt-1 text-sm text-muted-foreground" lang="und">
          Original wording: {fact.value}
        </p>
      )}
      {fact.note && <p className="mt-1 text-[0.95rem] font-semibold text-status-uncertain">{fact.note}</p>}
      {fact.excerpt && <SourceQuote label={s.evidence} className="mt-2">{fact.excerpt}</SourceQuote>}

      {fact.status === 'uncertain' && !editing && (
        <div className="mt-3 flex flex-wrap gap-2" lang="en">
          <Button size="sm" onClick={() => onConfirm(fieldKey, fact.value ?? fact.display ?? '')}>
            <Check aria-hidden="true" /> This is correct
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" /> Correct it
          </Button>
        </div>
      )}
      {editing && (
        <form
          lang="en"
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            if (!draft.trim()) return
            onConfirm(fieldKey, draft.trim())
            setEditing(false)
          }}
        >
          <div className="flex-1 space-y-1">
            <Label htmlFor={inputId}>Correct value, as written in the notice</Label>
            <Input id={inputId} value={draft} onChange={(e) => setDraft(e.target.value)} className="bg-card" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </li>
  )
}

export function ChecklistPanel({
  analysis,
  language,
  done,
  onToggle,
  onReset,
}: {
  analysis: Analysis
  language: LanguageCode
  done: Record<string, boolean>
  onToggle: (id: string, value: boolean) => void
  onReset: () => void
}) {
  const s = t(language)
  const required = analysis.checklist.filter((c) => c.mandatory)
  const suggestions = analysis.checklist.filter((c) => !c.mandatory)
  const total = analysis.checklist.length
  const completed = analysis.checklist.filter((c) => done[c.id]).length

  return (
    <Panel
      title={s.checklist}
      lang={language}
      icon={<ListChecks className="size-6 text-primary" aria-hidden="true" />}
      aside={
        total > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} disabled={completed === 0} lang="en">
            <RotateCcw aria-hidden="true" /> Reset
          </Button>
        )
      }
    >
      {total > 0 && (
        <div className="mb-5 space-y-1.5" lang="en">
          <p className="text-[0.95rem] font-semibold" aria-live="polite">
            {completed} of {total} done
          </p>
          <Progress value={(completed / total) * 100} aria-label="Checklist progress" />
        </div>
      )}

      {analysis.no_action_stated && (
        <p className="mb-4 rounded-md border bg-status-missing-bg p-3 font-semibold text-status-missing">{s.noActionStated}</p>
      )}

      {required.length > 0 && (
        <>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">{s.mandatory}</h4>
          <ol className="space-y-3">
            {required.map((item, i) => (
              <ChecklistRow key={item.id} item={item} index={i + 1} done={!!done[item.id]} onToggle={onToggle} language={language} />
            ))}
          </ol>
        </>
      )}

      {suggestions.length > 0 && (
        <div className={cn(required.length > 0 && 'mt-6')}>
          <h4 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{s.suggestions}</h4>
          <p className="mb-2 text-sm text-muted-foreground">{s.suggestionNote}</p>
          <ul className="space-y-3">
            {suggestions.map((item) => (
              <ChecklistRow key={item.id} item={item} done={!!done[item.id]} onToggle={onToggle} language={language} />
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

function ChecklistRow({
  item,
  index,
  done,
  onToggle,
  language,
}: {
  item: ChecklistItem
  index?: number
  done: boolean
  onToggle: (id: string, value: boolean) => void
  language: LanguageCode
}) {
  const s = t(language)
  const id = `check-${item.id}`
  return (
    <li
      className={cn(
        'rounded-lg border-2 p-3 transition-colors motion-reduce:transition-none',
        done ? 'border-status-stated/40 bg-status-stated-bg' : item.mandatory ? 'border-border bg-card' : 'border-dashed bg-muted/50',
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={done}
          onCheckedChange={(v) => onToggle(item.id, v === true)}
          className="mt-1 size-6 border-2"
        />
        <div className="min-w-0 flex-1">
          <Label htmlFor={id} className={cn('block text-base leading-snug font-semibold', done && 'line-through decoration-2')}>
            {index !== undefined && <span className="mr-1">{index}.</span>}
            {item.action}
          </Label>
          {item.requirement && <p className="mt-1 text-[0.95rem] text-muted-foreground">{item.requirement}</p>}
          {item.deadline && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-accent px-2 py-0.5 text-sm font-semibold text-accent-foreground">
              <CalendarClock className="size-4" aria-hidden="true" />
              {s.deadline}: {item.deadline}
            </p>
          )}
          {item.excerpt && (
            <details className="mt-2 text-[0.95rem]">
              <summary className="cursor-pointer font-semibold text-primary underline-offset-2 hover:underline">{s.evidence}</summary>
              <SourceQuote label={s.evidence} className="mt-1.5">{item.excerpt}</SourceQuote>
            </details>
          )}
        </div>
      </div>
    </li>
  )
}
