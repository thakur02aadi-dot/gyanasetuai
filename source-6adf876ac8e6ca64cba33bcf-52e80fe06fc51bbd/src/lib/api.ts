import type { Analysis, AnalyzeRequest, Answer, ApiErrorKind, AskRequest } from '@/lib/notice'

export class ApiClientError extends Error {
  constructor(
    message: string,
    public kind: ApiErrorKind | 'network',
  ) {
    super(message)
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new ApiClientError('Could not connect to the server. Check your internet connection and try again.', 'network')
  }
  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new ApiClientError(`The server returned an unexpected response (status ${res.status}). Please try again.`, 'malformed_response')
  }
  if (!res.ok) {
    const err = data as { error?: string; kind?: ApiErrorKind }
    throw new ApiClientError(err.error ?? `Request failed (status ${res.status}).`, err.kind ?? 'model_unavailable')
  }
  return data as T
}

export function analyzeNotice(body: AnalyzeRequest) {
  return postJson<{ analysis: Analysis; model: string }>('/api/analyze', body)
}

export function askQuestion(body: AskRequest) {
  return postJson<{ answer: Answer; model: string }>('/api/ask', body)
}
