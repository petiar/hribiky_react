import { useEffect, useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { WebView } from 'react-native-webview'

const API_URL = process.env.EXPO_PUBLIC_API_URL!
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!

export default function PrivacyScreen() {
    const router = useRouter()
    const theme = useTheme()
    const { t, i18n } = useTranslation()
    const [content, setContent] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        const lang = i18n.language.split('-')[0]
        fetch(`${API_URL}/privacy/${lang}`, {
            headers: { 'Api-Key': API_KEY },
        })
            .then(res => res.text())
            .then(text => setContent(text))
            .catch(() => setError(true))
            .finally(() => setLoading(false))
    }, [i18n.language])

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={[styles.back, { color: theme.primary }]}>{t('common.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('menu.privacyPolicy')}</Text>
                <View style={{ width: 60 }} />
            </View>

            {loading && (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            )}

            {error && (
                <View style={styles.center}>
                    <Text style={styles.errorText}>{t('add.errorGeneral')}</Text>
                </View>
            )}

            {content && (
                <WebView
                    source={{ html: content, baseUrl: API_URL }}
                    style={styles.webview}
                />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 56,
        paddingBottom: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    back: { fontSize: 15 },
    title: { fontSize: 17, fontWeight: '600', color: '#1a1a1a' },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: { fontSize: 15, color: '#888' },
    webview: { flex: 1 },
})