import type { TFunction } from 'i18next'
import { MAX_PHOTOS } from '../constants/limits'

// Kódy chýb zo servera, pre ktoré má appka vlastnú preloženú hlášku (kľúče `apiErrors.<kód>`).
// Server posiela `code` len pri niektorých chybách (viď hribiky/web/docs/api/README.md).
// `missing_field` a `invalid_api_key` server ako `code` neposiela, odvodíme ich zo statusu a textu.
const KNOWN_CODES = [
    'photo_too_large',
    'request_too_large',
    'photo_upload_failed',
    'too_many_photos',
    'missing_field',
    'invalid_api_key',
] as const

export type ApiErrorCode = typeof KNOWN_CODES[number]

/** Zistí kód chyby z odpovede servera. Vráti undefined, ak chybu nepoznáme. */
export const apiErrorCode = (status: number, data: any): string | undefined => {
    if (typeof data?.code === 'string') return data.code
    const message = typeof data?.message === 'string' ? data.message : ''
    if (message.startsWith('Missing required field')) return 'missing_field'
    if (status === 401 || message === 'Invalid API key') return 'invalid_api_key'
    return undefined
}

/** Preložená hláška pre kód chyby. Pre neznámy kód vráti `fallback`. */
export const apiErrorMessage = (t: TFunction, code: string | undefined, fallback: string): string =>
    code && (KNOWN_CODES as readonly string[]).includes(code) ? t(`apiErrors.${code}`, { max: MAX_PHOTOS }) : fallback
