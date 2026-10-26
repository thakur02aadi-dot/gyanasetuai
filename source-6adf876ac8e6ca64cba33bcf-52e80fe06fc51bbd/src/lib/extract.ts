// Browser-only text extraction. Files never leave the device: PDF.js reads
// text layers and Tesseract.js runs OCR locally (language data is downloaded
// from the Tesseract CDN on first use).

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_PDF_PAGES = 5
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf'

/** OCR words below this confidence (0-100) are flagged for review. */
const LOW_CONFIDENCE = 70

export type ExtractionMethod = 'ocr' | 'pdf-text' | 'pdf-ocr'

export type ExtractionResult = {
  text: string
  method: ExtractionMethod
  /** Mean OCR confidence 0-100, or null when no OCR was needed. */
  confidence: number | null
  lowConfidenceWords: string[]
  pages?: number
  skippedPages?: number
}

export type Progress = { label: string; value: number }

export function validateFile(file: File): string | null {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  const typeOk = (ACCEPTED_TYPES as readonly string[]).includes(file.type) || ['jpg', 'jpeg', 'png', 'pdf'].includes(ext)
  if (!typeOk) return `“${file.name}” is not supported. Please upload a JPG, PNG, or PDF file.`
  if (file.size > MAX_FILE_BYTES) return `“${file.name}” is larger than 10 MB. Please upload a smaller file.`
  if (file.size === 0) return `“${file.name}” is empty.`
  return null
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export async function extractFromFile(
  file: File,
  opts: { hindi: boolean; onProgress: (p: Progress) => void },
): Promise<ExtractionResult> {
  return isPdf(file) ? extractPdf(file, opts) : extractImage(file, opts)
}

async function ocr(
  images: (File | HTMLCanvasElement)[],
  opts: { hindi: boolean; onProgress: (p: Progress) => void },
  labelFor: (i: number) => string,
) {
  const { createWorker } = await import('tesseract.js')
  let current = 0
  const worker = await createWorker(opts.hindi ? ['eng', 'hin'] : 'eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        opts.onProgress({ label: labelFor(current), value: (current + m.progress) / images.length })
      } else if (current === 0) {
        opts.onProgress({ label: 'Loading the text-recognition engine…', value: 0 })
      }
    },
  })
  try {
    const texts: string[] = []
    const confidences: number[] = []
    const low = new Set<string>()
    for (current = 0; current < images.length; current++) {
      const { data } = await worker.recognize(images[current], {}, { text: true, blocks: true })
      texts.push(data.text.trim())
      for (const block of data.blocks ?? []) {
        for (const para of block.paragraphs) {
          for (const line of para.lines) {
            for (const word of line.words) {
              const w = word.text.trim()
              if (!w) continue
              confidences.push(word.confidence)
              if (word.confidence < LOW_CONFIDENCE && /[\p{L}\p{N}]/u.test(w)) low.add(w.replace(/[.,:;()]+$/, ''))
            }
          }
        }
      }
    }
    const confidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0
    return { text: texts.join('\n\n'), pages: texts, confidence: Math.round(confidence), lowConfidenceWords: [...low].slice(0, 300) }
  } finally {
    await worker.terminate()
  }
}

async function extractImage(file: File, opts: { hindi: boolean; onProgress: (p: Progress) => void }) {
  const r = await ocr([file], opts, () => 'Reading text from the image…')
  if (!r.text.trim()) throw new Error('No readable text was found in this image. Try a clearer photo, or paste the text instead.')
  return { text: r.text, confidence: r.confidence, lowConfidenceWords: r.lowConfidenceWords, method: 'ocr' as const }
}

async function extractPdf(file: File, opts: { hindi: boolean; onProgress: (p: Progress) => void }): Promise<ExtractionResult> {
  opts.onProgress({ label: 'Opening the PDF…', value: 0 })
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  let doc
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  } catch {
    throw new Error('This PDF could not be opened. It may be damaged or password-protected.')
  }

  const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES)
  const pageTexts: string[] = []
  const scanned: number[] = []
  for (let n = 1; n <= pageCount; n++) {
    opts.onProgress({ label: `Reading page ${n} of ${pageCount}…`, value: (n - 1) / pageCount })
    const page = await doc.getPage(n)
    const content = await page.getTextContent()
    let text = ''
    for (const item of content.items) {
      if ('str' in item) text += item.str + (item.hasEOL ? '\n' : ' ')
    }
    text = text.replace(/[ \t]+/g, ' ').trim()
    pageTexts.push(text)
    if (text.length < 40) scanned.push(n)
  }

  let confidence: number | null = null
  let lowConfidenceWords: string[] = []
  if (scanned.length) {
    // Scanned pages have no text layer: render them and run OCR.
    const canvases: HTMLCanvasElement[] = []
    for (const n of scanned) {
      const page = await doc.getPage(n)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      await page.render({ canvas, viewport }).promise
      canvases.push(canvas)
    }
    const result = await ocr(canvases, opts, (i) => `Scanning page ${scanned[i]} (${i + 1} of ${scanned.length} scanned pages)…`)
    scanned.forEach((n, i) => (pageTexts[n - 1] = result.pages[i] ?? ''))
    confidence = result.confidence
    lowConfidenceWords = result.lowConfidenceWords
  }
  const totalPages = doc.numPages
  await doc.destroy()

  const text = pageTexts.filter(Boolean).join('\n\n').trim()
  if (!text) throw new Error('No readable text was found in this PDF. Try a clearer scan, or paste the text instead.')
  return {
    text,
    method: scanned.length ? 'pdf-ocr' : 'pdf-text',
    confidence,
    lowConfidenceWords,
    pages: pageCount,
    skippedPages: Math.max(0, totalPages - MAX_PDF_PAGES),
  }
}
