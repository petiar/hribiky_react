import { useEffect, useState } from 'react'
import {
    StyleSheet, View, Text, FlatList,
    ActivityIndicator, TouchableOpacity
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from "../hooks/useTheme"
import { useTranslation } from 'react-i18next'

const API_URL = process.env.EXPO_PUBLIC_API_URL!
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!

type Leader = {
    name: string
    count: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardScreen() {
    const { t } = useTranslation()
    const theme = useTheme()
    const router = useRouter()
    const [leaders, setLeaders] = useState<Leader[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`${API_URL}/leaderboard`, {
            headers: { 'Api-Key': API_KEY }
        })
            .then(res => res.json())
            .then(data => setLeaders(data))
            .catch(err => console.error('Leaderboard error:', err))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3B6D11" />
            </View>
        )
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={[styles.backText, { color: theme.primary }]}>{t('leaderboard.back')}</Text>
            </TouchableOpacity>

            <Text style={[styles.heading, { color: theme.text }]}>{t('leaderboard.title')}</Text>
            <Text style={[styles.subheading, { color: theme.textSecondary }]}>{t('leaderboard.subtitle')}</Text>

            <FlatList
                data={leaders}
                keyExtractor={item => item.name}
                contentContainerStyle={styles.list}
                renderItem={({ item, index }) => (
                    <View style={[
                        styles.card,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                        index === 0 && { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                    ]}>
                        <Text style={styles.medal}>{index < 3 ? MEDALS[index] : `${index + 1}.`}</Text>
                        <Text style={[styles.name, { color: theme.text }, index === 0 && { fontWeight: '500' }]}>
                            {item.name}
                        </Text>
                        <View style={styles.countBadge}>
                            <Text style={[styles.countText, { color: theme.primary }]}>{item.count}</Text>
                        </View>
                    </View>
                )}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    backBtn: { padding: 16, paddingTop: 56 },
    backText: { fontSize: 15, color: '#3B6D11', fontWeight: '500' },
    heading: { fontSize: 24, fontWeight: '500', color: '#1a1a1a', paddingHorizontal: 16, marginBottom: 4 },
    subheading: { fontSize: 13, color: '#888', paddingHorizontal: 16, marginBottom: 20 },
    list: { paddingHorizontal: 16 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderWidth: 0.5,
        borderColor: '#ddd',
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: '#fafafa',
        gap: 12,
    },
    cardFirst: {
        backgroundColor: '#EAF3DE',
        borderColor: '#3B6D11',
    },
    medal: { fontSize: 22, width: 32, textAlign: 'center' },
    name: { flex: 1, fontSize: 15, color: '#1a1a1a', fontWeight: '400' },
    nameFirst: { fontWeight: '500' },
    countBadge: { flexDirection: 'row', alignItems: 'baseline' },
    countText: { fontSize: 18, fontWeight: '500', color: '#3B6D11' },
    countLabel: { fontSize: 12, color: '#888' },
})