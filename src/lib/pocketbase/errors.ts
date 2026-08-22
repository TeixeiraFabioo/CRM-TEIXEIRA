import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  const errObj = error as any
  const data =
    (error instanceof ClientResponseError ? error.response?.data : null) ||
    errObj?.response?.data ||
    errObj?.data?.data ||
    errObj?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (typeof detail === 'string') {
      errors[field] = detail
    } else if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

export function getErrorMessage(
  error: unknown,
  defaultMessage = 'Ocorreu um erro inesperado.',
): string {
  const fieldErrors = extractFieldErrors(error)
  const msgs = Object.values(fieldErrors).filter(Boolean)
  if (msgs.length > 0) {
    return msgs.join(', ')
  }
  if (error instanceof ClientResponseError) {
    return error.message || defaultMessage
  }
  if (error instanceof Error) {
    return error.message || defaultMessage
  }
  const errObj = error as any
  return errObj?.message || defaultMessage
}
