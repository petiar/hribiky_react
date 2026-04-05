import AsyncStorage from '@react-native-async-storage/async-storage'

const QUEUE_KEY = 'offline_queue'
const COMMENT_QUEUE_KEY = 'offline_comment_queue'

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
}

export const addToQueue = async (item: Omit<QueuedMushroom, 'id' | 'createdAt'>) => {
    const queue = await getQueue()
    const newItem: QueuedMushroom = {
        ...item,
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
    }
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, newItem]))
}

export const getQueue = async (): Promise<QueuedMushroom[]> => {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

export const removeFromQueue = async (id: string) => {
    const queue = await getQueue()
    const filtered = queue.filter(item => item.id !== id)
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered))
}

export type QueuedComment = {
    id: string
    mushroomId: string
    name: string
    description: string
    email?: string
    photos: string[]
    createdAt: string
}

export const addCommentToQueue = async (item: Omit<QueuedComment, 'id' | 'createdAt'>) => {
    const queue = await getCommentQueue()
    const newItem: QueuedComment = {
        ...item,
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
    }
    await AsyncStorage.setItem(COMMENT_QUEUE_KEY, JSON.stringify([...queue, newItem]))
}

export const getCommentQueue = async (): Promise<QueuedComment[]> => {
    try {
        const raw = await AsyncStorage.getItem(COMMENT_QUEUE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

export const removeCommentFromQueue = async (id: string) => {
    const queue = await getCommentQueue()
    const filtered = queue.filter(item => item.id !== id)
    await AsyncStorage.setItem(COMMENT_QUEUE_KEY, JSON.stringify(filtered))
}

export const sendQueuedComments = async (commentsApiUrl: string, apiKey: string): Promise<number> => {
    const queue = await getCommentQueue()
    if (queue.length === 0) return 0

    let sent = 0

    for (const item of queue) {
        try {
            const formData = new FormData()
            formData.append('mushroom_id', item.mushroomId)
            formData.append('name', item.name)
            formData.append('description', item.description)
            formData.append('source', 'api')
            if (item.email) formData.append('email', item.email)

            item.photos.forEach((uri, i) => {
                const filename = uri.split('/').pop() ?? `photo_${i}.jpg`
                const match = /\.(\w+)$/.exec(filename)
                const type = match ? `image/${match[1]}` : 'image/jpeg'
                formData.append('photos[]', { uri, name: filename, type } as any)
            })

            const res = await fetch(commentsApiUrl, {
                method: 'POST',
                headers: { 'Api-Key': apiKey },
                body: formData,
            })

            if (res.ok) {
                await removeCommentFromQueue(item.id)
                sent++
            }
        } catch {
            // Necháme v queue, skúsime nabudúce
        }
    }

    return sent
}

export const sendQueuedMushrooms = async (apiUrl: string, apiKey: string): Promise<number> => {
    const queue = await getQueue()
    if (queue.length === 0) return 0

    let sent = 0

    for (const item of queue) {
        try {
            const formData = new FormData()
            formData.append('title', item.title)
            formData.append('name', item.name)
            formData.append('description', item.description)
            formData.append('latitude', String(item.latitude))
            formData.append('longitude', String(item.longitude))
            formData.append('country', item.country)
            if (item.email) formData.append('email', item.email)
            if (item.altitude) formData.append('altitude', String(item.altitude))

            item.photos.forEach((uri, i) => {
                const filename = uri.split('/').pop() ?? `photo_${i}.jpg`
                const match = /\.(\w+)$/.exec(filename)
                const type = match ? `image/${match[1]}` : 'image/jpeg'
                formData.append('photos[]', { uri, name: filename, type } as any)
            })

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Api-Key': apiKey },
                body: formData,
            })

            if (res.ok) {
                await removeFromQueue(item.id)
                sent++
            }
        } catch {
            // Necháme v queue, skúsime nabudúce
        }
    }

    return sent
}