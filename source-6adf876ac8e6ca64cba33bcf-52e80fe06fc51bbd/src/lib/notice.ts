import { z } from 'zod'

// Shared between the browser and the server API routes.

/**
 * Output languages. To add a language, append an entry here and add its UI
 * strings to `src/lib/i18n.ts`. `promptName` is what Gemma is asked to write in.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', promptName: 'English', speechLang: 'en-IN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', promptName: 'Hindi (Devanagari script)', speechLang: 'hi-IN' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]]

export function getLanguage(code: LanguageCode) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}

export const READING_LEVELS = [
  {
    id: 'standard',
    label: 'Standard',
    hint: 'Clear, complete sentences',
    prompt: 'Standard plain language: clear, complete sentences at roughly a secondary-school reading level.',
  },
  {
    id: 'simple',
    label: 'Simple',
    hint: 'Short sentences, common words',
    prompt: 'Simple language: short sentences (under 15 words), everyday words, no jargon. Explain any unavoidable official term.',
  },
  {
    id: 'very_simple',
    label: 'Very simple',
    hint: 'One idea per sentence',
    prompt: 'Very simple language: one idea per sentence, sentences under 10 words, the most common words only, as if explaining to someone reading in a second language.',
  },
] as const

export type ReadingLevel = (typeof READING_LEVELS)[number]['id']
export const READING_LEVEL_IDS = READING_LEVELS.map((l) => l.id) as [ReadingLevel, ...ReadingLevel[]]

/** The facts extracted from every notice, in display order. */
export const FIELDS = [
  { key: 'title', label: 'Notice title', important: false },
  { key: 'issuing_organization', label: 'Issuing organization', important: false },
  { key: 'purpose', label: 'Purpose', important: false },
  { key: 'eligibility', label: 'Eligibility', important: true },
  { key: 'deadline', label: 'Application or event deadline', important: true },
  { key: 'event_datetime', label: 'Event date and time', important: true },
  { key: 'venue', label: 'Venue or location', important: true },
  { key: 'required_documents', label: 'Required documents', important: true },
  { key: 'application_steps', label: 'Application steps', important: true },
  { key: 'fees', label: 'Fees', important: true },
  { key: 'contact', label: 'Contact information', important: true },
  { key: 'official_url', label: 'Official URL', important: false },
  { key: 'required_action', label: 'Required action', important: true },
  { key: 'other_instructions', label: 'Other important instructions', important: false },
] as const

export type FieldKey = (typeof FIELDS)[number]['key']
export const FIELD_KEYS = FIELDS.map((f) => f.key) as [FieldKey, ...FieldKey[]]

export const FIELD_STATUSES = ['stated', 'not_stated', 'uncertain', 'user_confirmed'] as const
export type FieldStatus = (typeof FIELD_STATUSES)[number]

export const factSchema = z.object({
  /** The fact exactly as written in the source (original language). Null when not stated. */
  value: z.string().nullable(),
  /** The fact rewritten in the output language and reading level. */
  display: z.string().nullable(),
  status: z.enum(FIELD_STATUSES),
  /** Verbatim quote from the source supporting the fact. */
  excerpt: z.string().nullable(),
  /** Why a fact is uncertain, or a note about it. */
  note: z.string().nullable(),
})
export type Fact = z.infer<typeof factSchema>

export const checklistItemSchema = z.object({
  id: z.string(),
  action: z.string(),
  requirement: z.string().nullable(),
  deadline: z.string().nullable(),
  mandatory: z.boolean(),
  excerpt: z.string().nullable(),
})
export type ChecklistItem = z.infer<typeof checklistItemSchema>

export const analysisSchema = z.object({
  summary: z.string(),
  about: z.string(),
  applies_to: z.string().nullable(),
  what_to_do: z.string(),
  deadline_text: z.string().nullable(),
  documents_text: z.string().nullable(),
  unclear: z.array(z.string()),
  facts: z.record(z.enum(FIELD_KEYS), factSchema),
  missing_fields: z.array(z.enum(FIELD_KEYS)),
  checklist: z.array(checklistItemSchema),
  no_action_stated: z.boolean(),
  /** Server-side grounding checks that changed the model's output. */
  validation_notes: z.array(z.string()),
})
export type Analysis = z.infer<typeof analysisSchema>

export const ANSWER_TYPES = ['stated', 'not_stated', 'uncertain', 'out_of_scope'] as const
export type AnswerType = (typeof ANSWER_TYPES)[number]

export const answerSchema = z.object({
  answer: z.string(),
  answer_type: z.enum(ANSWER_TYPES),
  excerpts: z.array(z.string()),
  validation_note: z.string().nullable(),
})
export type Answer = z.infer<typeof answerSchema>

// ---- API request bodies ----

export const MAX_SOURCE_CHARS = 20000

export const analyzeRequestSchema = z.object({
  sourceText: z.string().trim().min(20, 'The notice text is too short to analyze.').max(MAX_SOURCE_CHARS),
  language: z.enum(LANGUAGE_CODES),
  readingLevel: z.enum(READING_LEVEL_IDS),
  /** Words OCR read with low confidence; facts quoting them stay "uncertain". */
  lowConfidenceWords: z.array(z.string().max(60)).max(300).default([]),
  /** Values the user has confirmed or corrected, in source wording. */
  confirmations: z.partialRecord(z.enum(FIELD_KEYS), z.string().max(2000)).default({}),
})
export type AnalyzeRequest = z.input<typeof analyzeRequestSchema>

export const askRequestSchema = z.object({
  sourceText: z.string().trim().min(20).max(MAX_SOURCE_CHARS),
  language: z.enum(LANGUAGE_CODES),
  question: z.string().trim().min(2, 'Please type a question.').max(500),
  confirmations: z.partialRecord(z.enum(FIELD_KEYS), z.string().max(2000)).default({}),
  history: z
    .array(z.object({ question: z.string().max(500), answer: z.string().max(3000) }))
    .max(6)
    .default([]),
})
export type AskRequest = z.input<typeof askRequestSchema>

export type ApiErrorKind = 'invalid_request' | 'model_unavailable' | 'rate_limited' | 'malformed_response' | 'config'
export type ApiError = { error: string; kind: ApiErrorKind }

// ---- Demo ----

export const DEMO_NOTICE = `SYNTHETIC DEMONSTRATION NOTICE — NOT A REAL UNIVERSITY ANNOUNCEMENT

Office of Student Welfare
Ref. No. SW/SCH/2026/041
Date: 20 October 2026

NOTICE: CAMPUS MERIT SCHOLARSHIP 2026–27

Applications are invited for the Campus Merit Scholarship for the academic year 2026–27.

Eligibility: Undergraduate students who have secured at least 75% marks in the previous semester examination are eligible to apply.

Last date for submission: 15 November 2026.

Documents required:
1. Student ID card
2. Previous semester marksheet

How to apply: Collect the application form, fill it in completely, attach the required documents, and submit the form to the college scholarship office.

Incomplete applications will not be considered.

Sd/-
Dean, Student Welfare`
