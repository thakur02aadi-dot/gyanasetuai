# Notice-to-Action Accessibility Assistant

**Understand the notice. Know what to do next.**

A web app that turns hard-to-read notices (scholarships, exams, government or campus announcements) into accurate, accessible action checklists in English or Hindi. Upload a photo, screenshot or PDF, or paste the text. The app extracts the text on your device, lets you check and correct it, then uses **Gemma 4** to:

- pull out key facts (deadline, eligibility, documents, fees, contact…), each marked **stated**, **not stated**, **needs checking** or **confirmed by you**, with a quote from the source
- explain the notice at three reading levels (Standard, Simple, Very simple)
- produce a numbered checklist that keeps official requirements separate from suggestions
- answer follow-up questions using only the notice, and say plainly when something is not stated

A built-in **synthetic** scholarship notice (clearly labelled as made up) demonstrates the whole flow, including the key moment: asking *"What is the application fee?"* returns *"The notice does not state an application fee. Please contact the issuing organization if you need confirmation."*

## Technology

| Part | Tool |
| --- | --- |
| Framework | TanStack Start (React 19, TypeScript), Vite, Tailwind CSS 4, shadcn/ui |
| OCR | Tesseract.js, which runs in the browser (English, plus Hindi on request) |
| PDF | PDF.js reads text-layer PDFs. Scanned pages are rendered and passed to OCR |
| AI model | Gemma 4 (`google/gemma-4-26b-a4b-it` by default) through Netlify AI Gateway |
| Read-aloud | Browser Speech Synthesis (play, pause, resume, stop) |
| Hosting | Netlify. The API routes run as Netlify Functions |

## Model setup

The app calls Gemma 4 through **Netlify AI Gateway** with the OpenAI-compatible SDK. Netlify injects the credentials at runtime, so you don't need an API key and none is stored in the code or sent to the browser.

- The AI Gateway turns on after the project's **first production deploy**. Until then, analysis shows a clear "Gemma 4 could not be reached" error.
- Optional: set `GEMMA_MODEL` to choose a different Gemma 4 variant, for example `google/gemma-4-31b-it`, which is slower but larger. The server refuses any model ID that isn't Gemma 4, so the app never quietly switches to another model.
- AI Gateway usage is billed against your Netlify account's credits, and each plan has its own limits. Check your plan's AI Gateway allowance before a public demo. The app doesn't claim that inference is unlimited or free.

## Running locally

```bash
pnpm install
netlify dev          # runs the app with Netlify emulation (AI Gateway included once the site is deployed)
```

Use `netlify dev` rather than plain `vite dev` so the AI Gateway credentials are available to the API routes.

## How accuracy is protected

Accuracy doesn't rely on the prompt alone:

1. **Notice text is untrusted.** It is wrapped in markers, and the system instruction tells the model to ignore any instructions it contains.
2. **Server-side validation.** Model output is safely parsed (with one automatic retry if the JSON is malformed) and checked against a Zod schema.
3. **Grounding checks.** The source quote for every "stated" fact must appear in the notice, and every number in a fact (dates, amounts, percentages) must also appear there. If either check fails, the fact is downgraded to "needs checking".
4. **Checklist steps need evidence.** A step without a verifiable quote is shown as a suggestion, not as an official requirement.
5. **OCR uncertainty is kept.** Words read with low confidence are flagged. Facts that rely on them stay "needs checking" until you confirm or correct them.
6. **Q&A is grounded.** An answer marked as found in the notice must include a verifiable quote, or it is downgraded to uncertain. Absent information gets an explicit "not stated" answer.

## Privacy

- Images and PDFs are processed in the browser and never uploaded. Tesseract language data is downloaded from its public CDN the first time it's used.
- Only the confirmed notice text is sent, via Netlify AI Gateway, to the inference provider that hosts Gemma 4.
- Nothing is stored. Notices, answers and checklist progress disappear when you reset or close the page.
- Server logs record only error types, never notice text.

## Limits

- Files: JPG, PNG or PDF, up to 10 MB. Only the first 5 PDF pages are read.
- Notice text: up to 20,000 characters.
- OCR quality depends on the photo. Always review the extracted text.
- The voices available for read-aloud depend on the device. Some devices have no Hindi voice.

## Adding a language

Add an entry to `LANGUAGES` in `src/lib/notice.ts` and a matching set of UI labels in `src/lib/i18n.ts`. The model prompts, selector and read-aloud pick it up automatically.
