import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from "../hooks/useTheme"
import { useTranslation } from 'react-i18next'
import Constants from 'expo-constants'

export default function AboutScreen() {
    const router = useRouter()
    const theme = useTheme()
    const { t } = useTranslation()
    const version = Constants.expoConfig?.version ?? '—'

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={[styles.back, { color: theme.primary }]}>{t('common.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('menu.about')}</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.appName}>Hribiky.sk</Text>
                <Text style={styles.description}>{t('menu.aboutText')}</Text>
                <Text style={styles.versionLabel}>{t('menu.version')}: {version}</Text>
            </ScrollView>
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
    content: {
        padding: 24,
        alignItems: 'center',
    },
    appName: {
        fontSize: 28,
        fontWeight: '700',
        color: '#3B6D11',
        marginBottom: 16,
        marginTop: 24,
    },
    description: {
        fontSize: 15,
        color: '#444',
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 32,
    },
    versionLabel: {
        fontSize: 13,
        color: '#aaa',
    },
})