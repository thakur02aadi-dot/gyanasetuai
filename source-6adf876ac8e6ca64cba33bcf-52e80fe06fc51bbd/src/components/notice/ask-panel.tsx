import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, MessageCircleQuestion, RotateCw, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SourceQuote, StatusBadge } from '@/components/notice/primitives'
import { t } from '@/lib/i18n'
import type { Answer, AnswerType, FieldStatus, LanguageCode } from '@/lib/notice'

export type QaEntry = {
  id: number
  question: string
  language: LanguageCode
  answer?: Answer
  error?: string
  pending?: boolean
}

const SUGGESTED = [
  'What is the application fee?',
  'What is the last date?',
  'Which documents are required?',
  'Who is eligible?',
  'Where should I submit the form?',
]

const ANSWER_STATUS: Record<AnswerType, FieldStatus> = {
  stated: 'stated',
  not_stated: 'not_stated',
  uncertain: 'uncertain',
  out_of_scope: 'not_stated',
}

export function AskPanel({
  entries,
  enabled,
  highlight,
  onAsk,
  onRetry,
}: {
  entries: QaEntry[]
  enabled: boolean
  highlight?: string
  onAsk: (question: string) => void
  onRetry: (id: number) => void
}) {
  const [question, setQuestion] = useState('')
  const pending = entries.some((e) => e.pending)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [entries.length])

  const submit = (q: string) => {
    if (!q.trim() || pending || !enabled) return
    onAsk(q.trim())
    setQuestion('')
  }

  return (
    <section aria-labelledby="ask-heading" className="rounded-xl border bg-card shadow-xs">
      <div className="border-b p-4 sm:p-5">
        <h2 id="ask-heading" className="flex items-center gap-2 text-xl font-bold">
          <MessageCircleQuestion className="size-6 text-primary" aria-hidden="true" />
          Ask about this notice
        </h2>
        <p className="mt-1 text-[0.95rem] text-muted-foreground">
          Answers come only from the notice text and facts you confirmed — never from guesses.
        </p>
      </div>

      <div className="max-h-[28rem] space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        {!enabled && <p className="text-muted-foreground">Analyze a notice first, then ask follow-up questions here.</p>}
        {enabled && entries.length === 0 && <p className="text-muted-foreground">Try one of the suggested questions below.</p>}
        {entries.map((e) => (
          <div key={e.id} className="space-y-2">
            <p className="ml-auto w-fit max-w-[90%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">{e.question}</p>
            {e.pending && (
              <p className="flex items-center gap-2 text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Gemma 4 is checking the notice…
              </p>
            )}
            {e.error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3" role="alert">
                <p className="flex items-start gap-2 font-semibold text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {e.error}
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => onRetry(e.id)}>
                  <RotateCw aria-hidden="true" /> Try again
                </Button>
              </div>
            )}
            {e.answer && <AnswerCard answer={e.answer} language={e.language} />}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="space-y-3 border-t p-4 sm:p-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested questions">
          {SUGGESTED.map((q) => (
            <Button
              key={q}
              size="sm"
              variant={q === highlight ? 'default' : 'secondary'}
              disabled={!enabled || pending}
              onClick={() => submit(q)}
              className="h-auto py-1.5 whitespace-normal text-left"
            >
              {q}
            </Button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit(question)
          }}
        >
          <Label htmlFor="question" className="sr-only">
            Your question
          </Label>
          <Input
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type a question in English or Hindi…"
            maxLength={500}
            disabled={!enabled}
            className="h-11 bg-card text-base"
          />
          <Button type="submit" size="icon-lg" className="size-11" disabled={!enabled || pending || !question.trim()} aria-label="Ask">
            <Send aria-hidden="true" />
          </Button>
        </form>
      </div>
    </section>
  )
}

function AnswerCard({ answer, language }: { answer: Answer; language: LanguageCode }) {
  const s = t(language)
  return (
    <div lang={language} className="max-w-[95%] space-y-2 rounded-lg rounded-bl-sm border bg-muted/60 p-3">
      <StatusBadge status={ANSWER_STATUS[answer.answer_type]} label={s.answerType[answer.answer_type]} />
      <p className="text-[1.02rem] leading-relaxed">{answer.answer}</p>
      {answer.excerpts.map((ex) => (
        <SourceQuote key={ex} label={s.evidence}>
          {ex}
        </SourceQuote>
      ))}
      {answer.validation_note && (
        <p className="text-sm font-semibold text-status-uncertain" lang="en">
          {answer.validation_note}
        </p>
      )}
    </div>
  )
}
