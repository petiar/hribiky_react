import '../locales/i18n'
import { useEffect, useState } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { Slot } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import NetInfo from '@react-native-community/netinfo'
import { sendQueuedMushrooms, sendQueuedComments } from '../utils/offlineQueue'
import { Alert } from 'react-native'

SplashScreen.preventAutoHideAsync()
const API_URL = process.env.EXPO_PUBLIC_API_URL!
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!

export default function Layout() {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        (async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            setReady(true)
            await SplashScreen.hideAsync()
        })()
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

    if (!ready) {
        return (
            <View style={styles.container}>
                <Image
                    source={require('../assets/splash.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Hribiky.sk</Text>
                <Text style={styles.subtitle}>Databáza turistických rozcestníkov</Text>
            </View>
        )
    }

    return <Slot />
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 180,
        height: 270,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '500',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#888',
    },
})