import '../locales/i18n'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import NetInfo from '@react-native-community/netinfo'
import { sendQueuedMushrooms, sendQueuedComments } from '../utils/offlineQueue'
import { Alert } from 'react-native'

SplashScreen.preventAutoHideAsync()
const API_URL = process.env.EXPO_PUBLIC_API_URL!
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!

export default function Layout() {
    useEffect(() => {
        SplashScreen.hideAsync()
    }, [])

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(async state => {
            if (state.isConnected && state.isInternetReachable) {
                const [sentMushrooms, sentComments] = await Promise.all([
                    sendQueuedMushrooms(`${API_URL}/mushrooms`, API_KEY),
                    sendQueuedComments(`${API_URL}/mushrooms_comments`, API_KEY),
                ])
                const parts: string[] = []
                if (sentMushrooms > 0) parts.push(`${sentMushrooms} hríbik${sentMushrooms > 1 ? 'y' : ''}`)
                if (sentComments > 0) parts.push(`${sentComments} komentár${sentComments > 1 ? 'e' : ''}`)
                if (parts.length > 0) {
                    Alert.alert('Online!', `Odoslali sme ${parts.join(' a ')} ktoré čakali offline.`)
                }
            }
        })

        return () => unsubscribe()
    }, [])

    return (
        <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />
    )
}