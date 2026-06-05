import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from "../hooks/useTheme"
import { useTranslation } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LANGUAGE_KEY } from './_layout'

const LANGUAGES = [
    { code: 'sk', label: 'Slovenčina' },
    { code: 'cs', label: 'Čeština' },
    { code: 'en', label: 'English' },
]

export default function SettingsScreen() {
    const router = useRouter()
    const theme = useTheme()
    const { t, i18n } = useTranslation()
    const current = i18n.language

    const changeLanguage = async (code: string) => {
        await AsyncStorage.setItem(LANGUAGE_KEY, code)
        i18n.changeLanguage(code)
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={[styles.back, { color: theme.primary }]}>{t('common.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('settings.title')}</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
                {LANGUAGES.map((lang, index) => (
                    <TouchableOpacity
                        key={lang.code}
                        style={[
                            styles.option,
                            index < LANGUAGES.length - 1 && styles.optionBorder,
                        ]}
                        onPress={() => changeLanguage(lang.code)}
                    >
                        <Text style={styles.optionText}>{lang.label}</Text>
                        {current === lang.code && (
                            <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f8f8' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 56,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    back: { fontSize: 15 },
    title: { fontSize: 17, fontWeight: '600', color: '#1a1a1a' },
    section: {
        marginTop: 32,
        marginHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    sectionLabel: {
        fontSize: 13,
        color: '#888',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    optionBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionText: { fontSize: 16, color: '#1a1a1a' },
    checkmark: { fontSize: 18, fontWeight: '600' },
})