import AsyncStorage from '@react-native-async-storage/async-storage'
import { Directory, File, Paths } from 'expo-file-system'
import { apiErrorCode } from './apiErrors'

const QUEUE_KEY = 'offline_queue'
const COMMENT_QUEUE_KEY = 'offline_comment_queue'
const UPLOAD_TIMEOUT_MS = 90_000

// Fotky vo fronte držíme v documentDirectory (cache môže systém kedykoľvek vymazať).
// Ukladáme len názov súboru, lebo absolútna cesta ku kontajneru appky sa na iOS
// pri aktualizácii mení.
const photoDir = () => new Directory(Paths.document, 'offline_photos')

export type QueuedMushroom = {
    id: string
    title: string
    name: string
    description: string
    email?: string
    latitude: number
    longitude: number
    altitude?: number
    country: 'SK' | 'CZ'
    photos: string[]
    createdAt: string
    attempts?: number
    lastError?: string
    /** Kód chyby zo servera (napr. photo_too_large) – na preloženú hlášku, viď utils/apiErrors.ts */
    lastErrorCode?: string
    /** Server položku natrvalo odmietol – automaticky sa už neposiela. */
    failed?: boolean
}

export type QueuedComment = {
    id: string
    mushroomId: string
    name: string
    description: string
    email?: string
    photos: string[]
    createdAt: string
    attempts?: number
    lastError?: string
    lastErrorCode?: string
    failed?: boolean
}

type QueueItem = {
    id: string
    photos: string[]
    attempts?: number
    lastError?: string
    lastErrorCode?: string
    failed?: boolean
}

// ---------- listenery (napr. počítadlo čakajúcich položiek na mape) ----------

export type QueueStatus = {
    /** Čaká na odoslanie (bude sa automaticky skúšať). */
    pending: number
    /** Server natrvalo odmietol, čaká na rozhodnutie používateľa. */
    failed: number
}

type Listener = (status: QueueStatus) => void
const listeners = new Set<Listener>()

export const getQueueStatus = async (): Promise<QueueStatus> => {
    const all: QueueItem[] = [...await getQueue(), ...await getCommentQueue()]
    const failed = all.filter(i => i.failed).length
    return { pending: all.length - failed, failed }
}

export const getPendingCount = async () => (await getQueueStatus()).pending

const notify = async () => {
    if (listeners.size === 0) return
    const status = await getQueueStatus()
    listeners.forEach(l => l(status))
}

export const subscribeQueue = (listener: Listener) => {
    listeners.add(listener)
    getQueueStatus().then(listener)
    return () => { listeners.delete(listener) }
}

// ---------- fotky ----------

const persistPhotos = (uris: string[], prefix: string): string[] => {
    const dir = photoDir()
    if (!dir.exists) dir.create({ intermediates: true })
    return uris.map((uri, i) => {
        try {
            const ext = /\.(\w+)$/.exec(uri)?.[1] ?? 'jpg'
            const name = `${prefix}_${i}.${ext}`
            const dest = new File(dir, name)
            if (dest.exists) dest.delete()
            new File(uri).copy(dest)
            return name
        } catch (e) {
            // Kópia zlyhala – necháme pôvodnú URI, aspoň kým existuje.
            console.warn('Offline queue: nepodarilo sa skopírovať fotku', uri, e)
            return uri
        }
    })
}

// Staršie záznamy obsahujú absolútnu URI, nové len názov súboru v offline_photos.
const resolvePhoto = (stored: string): File =>
    stored.includes('/') ? new File(stored) : new File(photoDir(), stored)

const deletePhotos = (stored: string[]) => {
    stored.forEach(s => {
        try {
            const f = resolvePhoto(s)
            if (f.exists) f.delete()
        } catch { /* nevadí */ }
    })
}

const appendPhotos = (formData: FormData, key: string, stored: string[]) => {
    stored.forEach((s, i) => {
        const file = resolvePhoto(s)
        // Chýbajúcu fotku preskočíme – radšej odoslať hríbik bez nej, ako ho nikdy neodoslať.
        if (!file.exists) return
        const filename = file.name || `photo_${i}.jpg`
        const ext = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase()
        const type = !ext || ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
        formData.append(key, { uri: file.uri, name: filename, type } as any)
    })
}

// ---------- úložisko ----------

const readList = async <T>(key: string): Promise<T[]> => {
    try {
        const raw = await AsyncStorage.getItem(key)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

const writeList = async <T>(key: string, list: T[]) => {
    await AsyncStorage.setItem(key, JSON.stringify(list))
    notify()
}

const newId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export const getQueue = () => readList<QueuedMushroom>(QUEUE_KEY)
export const getCommentQueue = () => readList<QueuedComment>(COMMENT_QUEUE_KEY)

export const addToQueue = async (item: Omit<QueuedMushroom, 'id' | 'createdAt'>) => {
    const id = newId()
    const photos = persistPhotos(item.photos, `m${id}`)
    const queue = await getQueue()
    await writeList(QUEUE_KEY, [...queue, { ...item, photos, id, createdAt: new Date().toISOString() }])
}

export const addCommentToQueue = async (item: Omit<QueuedComment, 'id' | 'createdAt'>) => {
    const id = newId()
    const photos = persistPhotos(item.photos, `c${id}`)
    const queue = await getCommentQueue()
    await writeList(COMMENT_QUEUE_KEY, [...queue, { ...item, photos, id, createdAt: new Date().toISOString() }])
}

const removeItem = async (key: string, id: string) => {
    const list = await readList<{ id: string }>(key)
    await writeList(key, list.filter(i => i.id !== id))
}

const markAttempt = async (key: string, id: string, error: string, permanent: boolean, code?: string) => {
    const list = await readList<QueueItem>(key)
    await writeList(key, list.map(i =>
        i.id === id
            ? {
                ...i,
                attempts: (i.attempts ?? 0) + 1,
                lastError: error,
                lastErrorCode: code,
                failed: permanent || undefined,
            }
            : i
    ))
}

/** Položky, ktoré server natrvalo odmietol (na zobrazenie používateľovi). */
export const getFailedItems = async () => ({
    mushrooms: (await getQueue()).filter(i => i.failed),
    comments: (await getCommentQueue()).filter(i => i.failed),
})

/** Vráti odmietnuté položky späť do fronty, aby sa skúsili poslať znova. */
export const retryFailed = async () => {
    for (const key of [QUEUE_KEY, COMMENT_QUEUE_KEY]) {
        const list = await readList<QueueItem>(key)
        await writeList(key, list.map(i => (i.failed ? { ...i, failed: undefined } : i)))
    }
}

/** Zmaže odmietnuté položky aj s ich fotkami. */
export const discardFailed = async () => {
    for (const key of [QUEUE_KEY, COMMENT_QUEUE_KEY]) {
        const list = await readList<QueueItem>(key)
        list.filter(i => i.failed).forEach(i => deletePhotos(i.photos))
        await writeList(key, list.filter(i => !i.failed))
    }
}

export const removeFromQueue = (id: string) => removeItem(QUEUE_KEY, id)
export const removeCommentFromQueue = (id: string) => removeItem(COMMENT_QUEUE_KEY, id)

// ---------- odosielanie ----------

type PostResult = { ok: true } | { ok: false; permanent: boolean; error: string; code?: string }

// Úspech = HTTP OK a zároveň server nevrátil { status: 'error' } (rovnako ako vo formulároch).
// Trvalé chyby (opakovanie nepomôže, viď hribiky/web/docs/api/README.md):
//   - 200 + status: 'error' (chýbajúce pole pri komentári)
//   - 422 chýbajúce pole / too_many_photos
//   - 413 photo_too_large / request_too_large
//   - 400 okrem photo_upload_failed (prerušený prenos fotky – ten skúšame znova)
// Ostatné (401/403 kľúč alebo zablokovaná IP, 404, 5xx, sieť, timeout) skúšame znova.
const isPermanent = (status: number, code?: string) => {
    if (status >= 200 && status < 300) return true
    if (status === 400) return code !== 'photo_upload_failed'
    return status === 413 || status === 422
}

const post = async (url: string, apiKey: string, body: FormData): Promise<PostResult> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Api-Key': apiKey },
            body,
            signal: controller.signal,
        })
        let data: any = null
        try { data = await res.json() } catch { /* ne-JSON odpoveď */ }
        if (res.ok && data?.status !== 'error') return { ok: true }
        return {
            ok: false,
            permanent: isPermanent(res.status, data?.code),
            code: apiErrorCode(res.status, data),
            error: `HTTP ${res.status}${data?.code ? ` ${data.code}` : ''}${data?.message ? `: ${data.message}` : ''}`,
        }
    } finally {
        clearTimeout(timer)
    }
}

const sendMushroom = (apiUrl: string, apiKey: string, item: QueuedMushroom) => {
    const formData = new FormData()
    formData.append('title', item.title)
    formData.append('name', item.name)
    formData.append('description', item.description)
    formData.append('latitude', String(item.latitude))
    formData.append('longitude', String(item.longitude))
    formData.append('country', item.country)
    if (item.email) formData.append('email', item.email)
    if (item.altitude) formData.append('altitude', String(item.altitude))
    appendPhotos(formData, 'photos[]', item.photos)
    return post(apiUrl, apiKey, formData)
}

const sendComment = (apiUrl: string, apiKey: string, item: QueuedComment) => {
    const formData = new FormData()
    formData.append('mushroom_id', item.mushroomId)
    formData.append('name', item.name)
    formData.append('description', item.description)
    formData.append('source', 'api')
    if (item.email) formData.append('email', item.email)
    appendPhotos(formData, 'photo[]', item.photos)
    return post(apiUrl, apiKey, formData)
}

const flush = async <T extends QueueItem>(
    key: string,
    send: (item: T) => Promise<PostResult>,
): Promise<number> => {
    const queue = (await readList<T>(key)).filter(i => !i.failed)
    let sent = 0
    for (const item of queue) {
        try {
            const result = await send(item)
            if (result.ok) {
                await removeItem(key, item.id)
                deletePhotos(item.photos)
                sent++
            } else {
                console.warn('Offline queue: server odmietol položku', item.id, result.error)
                await markAttempt(key, item.id, result.error, result.permanent, result.code)
            }
        } catch (e: any) {
            // Sieťová chyba / timeout – necháme v queue, skúsime nabudúce.
            console.warn('Offline queue: odoslanie zlyhalo', item.id, e?.message ?? e)
            await markAttempt(key, item.id, String(e?.message ?? e), false)
        }
    }
    return sent
}

export type SyncResult = { mushrooms: number; comments: number }

let running: Promise<SyncResult> | null = null

// Odošle obe fronty. Ak už odosielanie beží, nespustí druhé (žiadne duplikáty) a vráti nuly,
// aby o výsledku informoval len prvý volajúci.
export const syncQueues = async (apiUrl: string, apiKey: string): Promise<SyncResult> => {
    if (running) return { mushrooms: 0, comments: 0 }
    running = (async () => {
        try {
            const mushrooms = await flush<QueuedMushroom>(QUEUE_KEY, i => sendMushroom(`${apiUrl}/mushrooms`, apiKey, i))
            const comments = await flush<QueuedComment>(COMMENT_QUEUE_KEY, i => sendComment(`${apiUrl}/mushrooms_comments`, apiKey, i))
            return { mushrooms, comments }
        } finally {
            running = null
        }
    })()
    return running
}
