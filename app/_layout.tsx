import '../locales/i18n'
import { useEffect, useRef } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import NetInfo from '@react-native-community/netinfo'
import { syncQueues, getPendingCount, subscribeQueue } from '../utils/offlineQueue'
import { Alert, AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import i18n from '../locales/i18n'

SplashScreen.preventAutoHideAsync()
const API_URL = process.env.EXPO_PUBLIC_API_URL!
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!

export const LANGUAGE_KEY = 'user_language'

export default function Layout() {
    useEffect(() => {
        AsyncStorage.getItem(LANGUAGE_KEY).then(saved => {
            if (saved) i18n.changeLanguage(saved)
            SplashScreen.hideAsync()
        })
    }, [])

    const retryTimer = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        const trySync = async () => {
            const state = await NetInfo.fetch()
            // isInternetReachable môže byť null (ešte nezistené) – vtedy to skúsime, fetch prípadne zlyhá.
            if (!state.isConnected || state.isInternetReachable === false) return

            const { mushrooms, comments } = await syncQueues(API_URL, API_KEY)
            const parts: string[] = []
            if (mushrooms > 0) parts.push(i18n.t('common.onlineSyncedMushroom', { count: mushrooms }))
            if (comments > 0) parts.push(i18n.t('common.onlineSyncedComment', { count: comments }))
            if (parts.length > 0) {
                Alert.alert(
                    i18n.t('common.onlineTitle'),
                    i18n.t('common.onlineSynced', { items: parts.join(', ') })
                )
            }
        }

        const syncAndScheduleRetry = async () => {
            try {
                await trySync()
            } catch (e) {
                console.warn('Offline sync error:', e)
            }
            // Kým niečo čaká, skúšame znova každé 2 minúty (len v popredí).
            const pending = await getPendingCount()
            if (pending > 0 && !retryTimer.current && AppState.currentState === 'active') {
                retryTimer.current = setInterval(syncAndScheduleRetry, 2 * 60 * 1000)
            } else if (pending === 0 && retryTimer.current) {
                clearInterval(retryTimer.current)
                retryTimer.current = null
            }
        }

        // Pri štarte appky
        syncAndScheduleRetry()

        // Pri zmene siete
        const unsubscribeNet = NetInfo.addEventListener(state => {
            if (state.isConnected && state.isInternetReachable !== false) syncAndScheduleRetry()
        })

        // Pri návrate appky do popredia
        const appStateSub = AppState.addEventListener('change', next => {
            if (next === 'active') {
                syncAndScheduleRetry()
            } else if (retryTimer.current) {
                clearInterval(retryTimer.current)
                retryTimer.current = null
            }
        })

        // Keď do fronty pribudne položka (napr. upload zlyhal), naštartujeme opakovanie
        const unsubscribeQueue = subscribeQueue(({ pending }) => {
            if (pending > 0 && !retryTimer.current && AppState.currentState === 'active') {
                retryTimer.current = setInterval(syncAndScheduleRetry, 2 * 60 * 1000)
            }
        })

        return () => {
            unsubscribeNet()
            unsubscribeQueue()
            appStateSub.remove()
            if (retryTimer.current) clearInterval(retryTimer.current)
        }
    }, [])

    return (
        <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />
    )
}