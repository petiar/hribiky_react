import { useEffect, useState, useRef } from 'react'
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator, Image } from 'react-native'
import MapView from 'react-native-map-clustering'
import { Marker, Callout, PROVIDER_GOOGLE, MapView as RNMapView } from 'react-native-maps'
import { useRouter } from 'expo-router'
import * as ExpoLocation from 'expo-location'
import * as Haptics from 'expo-haptics'
import { useTheme } from "../hooks/useTheme"
import NetInfo from '@react-native-community/netinfo'
import { useTranslation } from 'react-i18next'

const API_URL = process.env.EXPO_PUBLIC_API_URL!
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!

let lastRegion = {
    latitude: 48.8,
    longitude: 19.5,
    latitudeDelta: 2,
    longitudeDelta: 2,
}

type Mushroom = {
    id: number
    title: string
    name: string
    description: string
    latitude: number
    longitude: number
    photos: string[]
}

const pinIcon = require('../assets/mushroom.png')

export default function MapScreen() {
    const router = useRouter()
    const [mushrooms, setMushrooms] = useState<Mushroom[]>([])
    const [loading, setLoading] = useState(true)
    const mapRef = useRef<RNMapView>(null)
    const theme = useTheme()
    const { t } = useTranslation()
    const [isOnline, setIsOnline] = useState<boolean | null>(null)

    useEffect(() => {
        NetInfo.fetch().then(state => {
            if (!state.isConnected) {
                setLoading(false)
                return
            }

            fetch(`${API_URL}/mushrooms`, {
                headers: { 'Api-Key': API_KEY }
            })
                .then(res => res.json())
                .then(data => {
                    console.log('Mushrooms count:', data.length)
                    setMushrooms(data)
                })
                .catch(err => console.error('API error:', err))
                .finally(() => setLoading(false))
        })
    }, [])

    useEffect(() => {
        NetInfo.fetch().then(state => {
            setIsOnline(!!(state.isConnected && state.isInternetReachable))
        })
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(!!(state.isConnected && state.isInternetReachable))
        })
        return () => unsubscribe()
    }, [])

    const goToMyLocation = async () => {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync()
        if (status !== 'granted') return

        const loc = await ExpoLocation.getCurrentPositionAsync({})
        mapRef.current?.animateToRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        }, 800)
    }

    const renderCluster = (cluster: any) => {
        const { id, geometry, onPress, properties } = cluster
        const { point_count } = properties
        const [longitude, latitude] = geometry.coordinates
        return (
            <Marker
                key={`cluster-${id}`}
                coordinate={{ latitude, longitude }}
                onPress={onPress}
                tracksViewChanges={true}
            >
                <View style={styles.cluster}>
                    <Image source={pinIcon} style={styles.clusterIcon} resizeMode="contain" />
                    <View style={styles.clusterBadge}>
                        <Text style={styles.clusterCount}>{point_count}</Text>
                    </View>
                </View>
            </Marker>
        )
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={lastRegion}
                onRegionChangeComplete={region => { lastRegion = region }}
                renderCluster={renderCluster}
            >
                {mushrooms.map(m => (
                    <Marker
                        key={m.id}
                        coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                        tracksViewChanges={true}
                    >
                        <Image source={pinIcon} style={{ width: 30, height: 45 }} resizeMode="contain" />
                        <Callout tooltip onPress={() => router.push(`/mushroom/${m.id}`)}>
                            <View style={styles.callout}>
                                {m.photos?.[0] && (
                                    <Image
                                        source={{ uri: m.photos[0] }}
                                        style={styles.calloutImage}
                                        resizeMode="cover"
                                    />
                                )}
                                <View style={styles.calloutBody}>
                                    <Text style={styles.calloutTitle}>{m.title}</Text>
                                    {m.name && (
                                        <Text style={styles.calloutName}>{m.name}</Text>
                                    )}
                                    {m.description && (
                                        <Text style={styles.calloutDesc} numberOfLines={2}>
                                            {m.description}
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.calloutArrow} />
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>

            {!isOnline && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>⚠ {t('common.offlineBanner')}</Text>
                </View>
            )}

            {loading && (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#3B6D11" />
                </View>
            )}

            <TouchableOpacity style={styles.locBtn} onPress={goToMyLocation}>
                <Text style={styles.locIcon}>◎</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                    router.push('/nearby')
                }}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.leaderBtn}
                onPress={() => router.push('/leaderboard')}
            >
                <Text style={styles.leaderIcon}>🏆</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    loader: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 20,
    },
    callout: {
        width: 220,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    calloutImage: {
        width: '100%',
        height: 120,
    },
    calloutBody: {
        padding: 10,
    },
    calloutTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    calloutName: {
        fontSize: 12,
        color: '#3B6D11',
        marginBottom: 4,
    },
    calloutDesc: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },
    calloutArrow: {
        width: 0,
        height: 0,
        alignSelf: 'center',
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#fff',
        marginBottom: -1,
    },
    fab: {
        position: 'absolute',
        bottom: 40,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#3B6D11',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    fabText: {
        color: '#fff',
        fontSize: 32,
        lineHeight: 36,
    },
    locBtn: {
        position: 'absolute',
        bottom: 110,
        right: 24,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    locIcon: {
        fontSize: 20,
        color: '#3B6D11',
    },
    leaderBtn: {
        position: 'absolute',
        top: 56,
        right: 24,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    leaderIcon: { fontSize: 20 },
    cluster: { position: 'relative' },
    clusterIcon: { width: 50, height: 75 },
    clusterBadge: {
        position: 'absolute',
        bottom: 4,
        right: 0,
        minWidth: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
        borderWidth: 0.5,
        borderColor: '#ddd',
    },
    clusterCount: { color: '#1a1a1a', fontSize: 13, fontWeight: '700' },
    offlineBanner: {
        position: 'absolute',
        top: 106,
        left: 16,
        right: 16,
        backgroundColor: '#e24b4a',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    offlineText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
})