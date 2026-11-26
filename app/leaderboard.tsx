import { useEffect, useMemo, useState } from 'react'
import {
    StyleSheet, View, Text, FlatList, Modal, ScrollView,
    ActivityIndicator, TouchableOpacity
} from 'react-native'
import { useRouter } from 'expo-router'
import { SvgUri } from 'react-native-svg'
import { TFunction } from 'i18next'
import { useTheme } from "../hooks/useTheme"
import { useTranslation } from 'react-i18next'
import { Theme } from '../constants/theme'

const API_URL = process.env.EXPO_PUBLIC_API_URL!

// Typy podľa hribiky/web/docs/api/leaderboard.md. Nové polia sú voliteľné, neznáme typy odznakov sa zobrazia
// so serverovým názvom (server môže pridať nové odznaky skôr, ako ich appka pozná).
type BadgeType =
    | 'Vyskar' | 'Krtko' | 'Cestovatel' | 'Rozpravac'
    | 'Fotograf' | 'Kronikar' | 'SezonnyZberatel' | 'Vytrvalec'
    | (string & {})

type UserBadge = {
    type: BadgeType
    label: string
    icon_url: string
    value: number | null
    awarded_at: string
}

type BadgeDefinition = {
    type: BadgeType
    label: string
    description: string
    is_trophy: boolean
    icon_url: string
}

type Leader = {
    name: string
    mushroom_count: number
    comment_count: number
    score: number
    badges?: UserBadge[]
}

const KNOWN_BADGES = ['Vyskar', 'Krtko', 'Cestovatel', 'Rozpravac', 'Fotograf', 'Kronikar', 'SezonnyZberatel', 'Vytrvalec']
const isKnown = (type: string) => KNOWN_BADGES.includes(type)

const MEDALS = ['🥇', '🥈', '🥉']

const badgeLabel = (t: TFunction, type: string, fallback: string) =>
    isKnown(type) ? t(`badges.types.${type}.label`) : fallback

const badgeDescription = (t: TFunction, type: string, fallback?: string) =>
    isKnown(type) ? t(`badges.types.${type}.description`) : fallback

const formatBadgeValue = (t: TFunction, badge: UserBadge): string | null => {
    const v = badge.value
    if (v === null || v === undefined) return null
    switch (badge.type) {
        case 'Vyskar':
        case 'Krtko':
        case 'Fotograf':
        case 'Kronikar':
        case 'Vytrvalec':
            return t(`badges.value.${badge.type}`, { value: Math.round(v) })
        case 'Cestovatel':
            return t('badges.value.Cestovatel', { value: Math.round(v / 1000) })
        case 'Rozpravac':
            return t('badges.value.Rozpravac', { value: v.toFixed(1) })
        default:
            return null // SezonnyZberatel a neznáme typy
    }
}

function BadgeIcon({ uri, size }: { uri: string; size: number }) {
    const [failed, setFailed] = useState(false)
    if (failed) {
        return <Text style={{ fontSize: size * 0.8, width: size, textAlign: 'center' }}>🏅</Text>
    }
    return <SvgUri uri={uri} width={size} height={size} onError={() => setFailed(true)} />
}

type Selected = { badge: UserBadge; owner: string }

export default function LeaderboardScreen() {
    const { t, i18n } = useTranslation()
    const theme = useTheme()
    const router = useRouter()
    const [leaders, setLeaders] = useState<Leader[]>([])
    const [definitions, setDefinitions] = useState<BadgeDefinition[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [selected, setSelected] = useState<Selected | null>(null)
    const [legendVisible, setLegendVisible] = useState(false)

    const load = () => {
        setLoading(true)
        setError(false)
        // Rebríček ani odznaky nevyžadujú Api-Key.
        Promise.all([
            fetch(`${API_URL}/leaderboard`).then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json()
            }),
            // Vysvetlivky nie sú kritické – keď zlyhajú, rebríček sa aj tak zobrazí.
            fetch(`${API_URL}/leaderboard/badges`)
                .then(res => (res.ok ? res.json() : []))
                .catch(() => []),
        ])
            .then(([leaderData, badgeData]) => {
                setLeaders(Array.isArray(leaderData) ? leaderData : [])
                setDefinitions(Array.isArray(badgeData) ? badgeData : [])
            })
            .catch(err => {
                console.error('Leaderboard error:', err)
                setError(true)
            })
            .finally(() => setLoading(false))
    }

    useEffect(load, [])

    const definitionByType = useMemo(
        () => Object.fromEntries(definitions.map(d => [d.type, d])),
        [definitions]
    )

    const styles = useMemo(() => makeStyles(theme), [theme])

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        )
    }

    const selectedDef = selected ? definitionByType[selected.badge.type] : undefined
    const selectedValue = selected ? formatBadgeValue(t, selected.badge) : null

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backText}>{t('leaderboard.back')}</Text>
                </TouchableOpacity>
                {definitions.length > 0 && (
                    <TouchableOpacity style={styles.legendBtn} onPress={() => setLegendVisible(true)}>
                        <Text style={styles.legendBtnText}>🏅 {t('badges.button')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.heading}>{t('leaderboard.title')}</Text>
            <Text style={styles.subheading}>{t('leaderboard.subtitle')}</Text>

            {error ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>{t('leaderboard.error')}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={load}>
                        <Text style={styles.retryText}>{t('detail.retry')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={leaders}
                    keyExtractor={(item, index) => `${index}-${item.name}`}
                    contentContainerStyle={styles.list}
                    renderItem={({ item, index }) => {
                        const badges = item.badges ?? []
                        return (
                            <View style={[styles.card, index === 0 && styles.cardFirst]}>
                                <Text style={styles.medal}>{index < 3 ? MEDALS[index] : `${index + 1}.`}</Text>

                                <View style={styles.cardBody}>
                                    <Text style={[styles.name, index === 0 && styles.nameFirst]}>{item.name}</Text>
                                    <Text style={styles.stats}>
                                        🍄 {item.mushroom_count}   💬 {item.comment_count}
                                    </Text>
                                    {badges.length > 0 && (
                                        <View style={styles.badgeRow}>
                                            {badges.map(b => (
                                                <TouchableOpacity
                                                    key={b.type}
                                                    onPress={() => setSelected({ badge: b, owner: item.name })}
                                                    hitSlop={4}
                                                    accessibilityLabel={badgeLabel(t, b.type, b.label)}
                                                >
                                                    <BadgeIcon uri={b.icon_url} size={28} />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                <View style={styles.score}>
                                    <Text style={styles.scoreText}>{item.score}</Text>
                                    <Text style={styles.scoreLabel}>{t('leaderboard.points')}</Text>
                                </View>
                            </View>
                        )
                    }}
                />
            )}

            {/* Detail jedného odznaku */}
            <Modal
                visible={!!selected}
                transparent
                animationType="fade"
                onRequestClose={() => setSelected(null)}
            >
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
                    {selected && (
                        <View style={styles.sheet}>
                            <BadgeIcon uri={selected.badge.icon_url} size={72} />
                            <Text style={styles.sheetTitle}>
                                {badgeLabel(t, selected.badge.type, selected.badge.label)}
                            </Text>
                            {selectedDef && (
                                <Text style={styles.kind}>
                                    {selectedDef.is_trophy ? t('badges.trophy') : t('badges.achievement')}
                                </Text>
                            )}
                            <Text style={styles.sheetOwner}>{selected.owner}</Text>
                            {!!badgeDescription(t, selected.badge.type, selectedDef?.description) && (
                                <Text style={styles.sheetDesc}>
                                    {badgeDescription(t, selected.badge.type, selectedDef?.description)}
                                </Text>
                            )}
                            {selectedValue && <Text style={styles.sheetValue}>{selectedValue}</Text>}
                            <Text style={styles.sheetDate}>
                                {t('badges.awarded', {
                                    date: new Date(selected.badge.awarded_at).toLocaleDateString(i18n.language, {
                                        day: 'numeric', month: 'long', year: 'numeric',
                                    }),
                                })}
                            </Text>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                                <Text style={styles.closeText}>{t('badges.close')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </TouchableOpacity>
            </Modal>

            {/* Vysvetlivky všetkých odznakov */}
            <Modal
                visible={legendVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setLegendVisible(false)}
            >
                <View style={styles.legend}>
                    <View style={styles.legendHeader}>
                        <Text style={styles.legendTitle}>{t('badges.title')}</Text>
                        <TouchableOpacity onPress={() => setLegendVisible(false)} hitSlop={8}>
                            <Text style={styles.backText}>{t('badges.close')}</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.legendList}>
                        {[true, false].map(trophy => {
                            const group = definitions.filter(d => d.is_trophy === trophy)
                            if (group.length === 0) return null
                            return (
                                <View key={String(trophy)} style={styles.legendGroup}>
                                    <Text style={styles.legendGroupTitle}>
                                        {trophy ? t('badges.trophies') : t('badges.achievements')}
                                    </Text>
                                    <Text style={styles.legendGroupHint}>
                                        {trophy ? t('badges.trophyHint') : t('badges.achievementHint')}
                                    </Text>
                                    {group.map(d => (
                                        <View key={d.type} style={styles.legendItem}>
                                            <BadgeIcon uri={d.icon_url} size={40} />
                                            <View style={styles.legendItemBody}>
                                                <Text style={styles.legendItemTitle}>{badgeLabel(t, d.type, d.label)}</Text>
                                                <Text style={styles.legendItemDesc}>
                                                    {badgeDescription(t, d.type, d.description)}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )
                        })}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    )
}

const makeStyles = (theme: Theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16 },
    backBtn: {},
    backText: { fontSize: 15, color: theme.primary, fontWeight: '500' },
    legendBtn: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
        backgroundColor: theme.primaryLight,
    },
    legendBtnText: { fontSize: 14, color: theme.primary, fontWeight: '500' },
    heading: { fontSize: 24, fontWeight: '500', color: theme.text, paddingHorizontal: 16, marginBottom: 4 },
    subheading: { fontSize: 13, color: theme.textSecondary, paddingHorizontal: 16, marginBottom: 20 },
    errorText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginBottom: 16 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.primary },
    retryText: { color: '#fff', fontWeight: '500' },
    list: { paddingHorizontal: 16, paddingBottom: 32 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderWidth: 0.5,
        borderColor: theme.border,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: theme.surface,
        gap: 12,
    },
    cardFirst: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
    medal: { fontSize: 22, width: 32, textAlign: 'center' },
    cardBody: { flex: 1, gap: 4 },
    name: { fontSize: 15, color: theme.text, fontWeight: '400' },
    nameFirst: { fontWeight: '600' },
    stats: { fontSize: 12, color: theme.textSecondary },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    score: { alignItems: 'center', minWidth: 44 },
    scoreText: { fontSize: 18, fontWeight: '600', color: theme.primary },
    scoreLabel: { fontSize: 11, color: theme.textSecondary },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 32 },
    sheet: { backgroundColor: theme.background, borderRadius: 16, padding: 24, alignItems: 'center', gap: 6 },
    sheetTitle: { fontSize: 20, fontWeight: '600', color: theme.text, marginTop: 8 },
    kind: {
        fontSize: 11, fontWeight: '600', color: theme.primary, textTransform: 'uppercase', letterSpacing: 0.5,
        backgroundColor: theme.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden',
    },
    sheetOwner: { fontSize: 14, color: theme.textSecondary },
    sheetDesc: { fontSize: 14, color: theme.text, textAlign: 'center', marginTop: 6, lineHeight: 20 },
    sheetValue: { fontSize: 16, fontWeight: '600', color: theme.primary, marginTop: 4 },
    sheetDate: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
    closeBtn: { marginTop: 14, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.primary },
    closeText: { color: '#fff', fontWeight: '500' },

    legend: { flex: 1, backgroundColor: theme.background },
    legendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    legendTitle: { fontSize: 22, fontWeight: '600', color: theme.text },
    legendList: { paddingHorizontal: 20, paddingBottom: 40 },
    legendGroup: { marginBottom: 24 },
    legendGroupTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
    legendGroupHint: { fontSize: 13, color: theme.textSecondary, marginTop: 2, marginBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
    legendItemBody: { flex: 1 },
    legendItemTitle: { fontSize: 15, fontWeight: '500', color: theme.text },
    legendItemDesc: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
})
