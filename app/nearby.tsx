import { useEffect, useState } from 'react'
import {
    StyleSheet, View, Text, TouchableOpacity,
    FlatList, ActivityIndicator, Alert
} from 'react-native'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import NetInfo from '@react-native-community/netinfo'

const API_URL = process.env.EXPO_PUBLIC_API_URL!
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!

type NearbyMushroom = {
    id: number
    title: string
    name: string
    description: string
    distance: number
}

export default function NearbyScreen() {
    const { t } = useTranslation()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [mushrooms, setMushrooms] = useState<NearbyMushroom[]>([])
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null)

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                Alert.alert('GPS', t('common.gpsPermission'))
                router.back()
                return
            }

            const loc = await Location.getCurrentPositionAsync({})
            const { latitude, longitude } = loc.coords
            setLocation({ latitude, longitude })

            const netState = await NetInfo.fetch()
            if (!netState.isConnected || !netState.isInternetReachable) {
                router.replace({
                    pathname: '/add',
                    params: { latitude, longitude }
                })
                return
            }

            try {
                const res = await fetch(
                    `${API_URL}/mushrooms/nearby?latitude=${latitude}&longitude=${longitude}`,
                    { headers: { 'Api-Key': API_KEY } }
                )
                const data = await res.json()
                const list = data.hribiky ?? []

                if (list.length === 0) {
                    router.replace({
                        pathname: '/add',
                        params: { latitude, longitude }
                    })
                } else {
                    setMushrooms(list)
                    setLoading(false)
                }
            } catch (e) {
                console.error('Nearby error:', e)
                router.replace({
                    pathname: '/add',
                    params: { latitude, longitude }
                })
            }
        })()
    }, [])

    const goAddNew = () => {
        router.push({
            pathname: '/add',
            params: {
                latitude: location?.latitude,
                longitude: location?.longitude,
            }
        })
    }

    const goAddComment = (id: number, title: string) => {
        router.push({
            pathname: '/add-comment',
            params: { id, title }
        })
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3B6D11" />
                <Text style={styles.loadingText}>{t('nearby.loading')}</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>

            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backText}>{t('common.back')}</Text>
            </TouchableOpacity>

            {mushrooms.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyTitle}>{t('nearby.emptyTitle')}</Text>
                    <Text style={styles.emptySubtitle}>{t('nearby.emptySubtitle')}</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={goAddNew}>
                        <Text style={styles.addBtnText}>{t('add.title')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.container}>
                    <Text style={styles.heading}>{t('nearby.title')}</Text>
                    <Text style={styles.subheading}>{t('nearby.subtitle')}</Text>

                    <FlatList
                        data={mushrooms}
                        keyExtractor={item => String(item.id)}
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.card}
                                onPress={() => goAddComment(item.id, item.title)}
                            >
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                {item.name && <Text style={styles.cardName}>{item.name}</Text>}
                                {item.description && (
                                    <Text style={styles.cardDesc} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                )}
                                <Text style={styles.cardAction}>{t('nearby.addComment')} →</Text>
                            </TouchableOpacity>
                        )}
                    />

                    <TouchableOpacity style={styles.addBtn} onPress={goAddNew}>
                        <Text style={styles.addBtnText}>{t('nearby.addNew')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    backBtn: { padding: 16, paddingTop: 56 },
    backText: { fontSize: 15, color: '#3B6D11', fontWeight: '500' },
    loadingText: { marginTop: 12, fontSize: 15, color: '#555' },
    heading: { fontSize: 22, fontWeight: '500', color: '#1a1a1a', paddingHorizontal: 16, marginBottom: 4 },
    subheading: { fontSize: 13, color: '#888', paddingHorizontal: 16, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '500', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
    emptySubtitle: { fontSize: 15, color: '#888', marginBottom: 24 },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    card: {
        padding: 14,
        borderWidth: 0.5,
        borderColor: '#ddd',
        borderRadius: 10,
        marginBottom: 12,
        backgroundColor: '#fafafa',
    },
    cardTitle: { fontSize: 15, fontWeight: '500', color: '#1a1a1a', marginBottom: 2 },
    cardName: { fontSize: 13, color: '#3B6D11', marginBottom: 4 },
    cardDesc: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 8 },
    cardAction: { fontSize: 13, color: '#3B6D11', fontWeight: '500' },
    addBtn: {
        margin: 16,
        padding: 16,
        backgroundColor: '#3B6D11',
        borderRadius: 10,
        alignItems: 'center',
    },
    addBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
})