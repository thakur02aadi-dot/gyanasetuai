import { CheckCircle2, CircleHelp, CircleSlash, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldStatus } from '@/lib/notice'

const STATUS_STYLE: Record<FieldStatus, { className: string; Icon: typeof CheckCircle2 }> = {
  stated: { className: 'bg-status-stated-bg text-status-stated border-status-stated/30', Icon: CheckCircle2 },
  not_stated: { className: 'bg-status-missing-bg text-status-missing border-status-missing/25', Icon: CircleSlash },
  uncertain: { className: 'bg-status-uncertain-bg text-status-uncertain border-status-uncertain/40', Icon: CircleHelp },
  user_confirmed: { className: 'bg-status-confirmed-bg text-status-confirmed border-status-confirmed/30', Icon: ShieldCheck },
}

export function StatusBadge({ status, label, className }: { status: FieldStatus; label: string; className?: string }) {
  const { className: tone, Icon } = STATUS_STYLE[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap',
        tone,
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </span>
  )
}

/** A verbatim quote from the source notice. */
export function SourceQuote({ label, children, className }: { label: string; children: string; className?: string }) {
  return (
    <figure className={cn('border-l-4 border-saffron bg-muted/70 px-3 py-2 rounded-r-md', className)}>
      <figcaption className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</figcaption>
      <blockquote className="mt-0.5 text-[0.95rem] text-foreground" lang="und">
        “{children}”
      </blockquote>
    </figure>
  )
}

type Option<T extends string> = { value: T; label: string; hint?: string; lang?: string }

/** Accessible segmented control built on native radio inputs. */
export function Segmented<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled,
}: {
  legend: string
  name: string
  options: readonly Option<T>[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-1.5 text-sm font-bold text-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'relative flex cursor-pointer flex-col rounded-md border-2 px-3 py-1.5 text-[0.95rem] leading-tight transition-colors motion-reduce:transition-none',
              'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-offset-2',
              'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
              value === o.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-card text-foreground hover:border-primary/60',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className="font-semibold" lang={o.lang}>
              {o.label}
            </span>
            {o.hint && (
              <span className={cn('text-xs', value === o.value ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
                {o.hint}
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function SectionHeading({ step, title, id }: { step?: number; title: string; id?: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-xl font-bold sm:text-2xl">
      {step !== undefined && (
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-sans text-base text-primary-foreground"
          aria-hidden="true"
        >
          {step}
        </span>
      )}
      {title}
    </h2>
  )
}
