import '../locales/i18n'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import NetInfo from '@react-native-community/netinfo'
import { sendQueuedMushrooms, sendQueuedComments } from '../utils/offlineQueue'
import { Alert } from 'react-native'
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

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(async state => {
            if (state.isConnected && state.isInternetReachable) {
                const [sentMushrooms, sentComments] = await Promise.all([
                    sendQueuedMushrooms(`${API_URL}/mushrooms`, API_KEY),
                    sendQueuedComments(`${API_URL}/mushrooms_comments`, API_KEY),
                ])
                const parts: string[] = []
                if (sentMushrooms > 0) parts.push(i18n.t('common.onlineSyncedMushroom', { count: sentMushrooms }))
                if (sentComments > 0) parts.push(i18n.t('common.onlineSyncedComment', { count: sentComments }))
                if (parts.length > 0) {
                    Alert.alert(
                        i18n.t('common.onlineTitle'),
                        i18n.t('common.onlineSynced', { items: parts.join(', ') })
                    )
                }
            }
        })

        return () => unsubscribe()
    }, [])

    return (
        <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />
    )
}