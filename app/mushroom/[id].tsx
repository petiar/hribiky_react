import { useEffect, useState } from 'react'
import {
    StyleSheet, View, Text, Image, ScrollView,
    ActivityIndicator, TouchableOpacity, Dimensions, Share,
    Linking, ActionSheetIOS, Alert, Platform
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

const API_URL = process.env.EXPO_PUBLIC_API_URL!
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!

const { width } = Dimensions.get('window')

type Mushroom = {
    id: number
    title: string
    name: string
    description: string
    latitude: number
    longitude: number
    altitude: number | null
    photos: string[]
    createdAt: string
}

export default function MushroomDetail() {
    const { id } = useLocalSearchParams()
    const router = useRouter()
    const [mushroom, setMushroom] = useState<Mushroom | null>(null)
    const [loading, setLoading] = useState(true)
    const [activePhoto, setActivePhoto] = useState(0)

    useEffect(() => {
        fetch(`${API_URL}/mushrooms/${id}/`, {
            headers: { 'Api-Key': API_KEY }
        })
            .then(res => res.json())
            .then(data => setMushroom(data))
            .catch(err => console.error('API error:', err))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3B6D11" />
            </View>
        )
    }

    if (!mushroom) {
        return (
            <View style={styles.center}>
                <Text>Hríbik sa nenašiel</Text>
            </View>
        )
    }

    const date = new Date(mushroom.createdAt).toLocaleDateString('sk-SK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    const shareMushr = async () => {
        const url = `https://hribiky.sk/${mushroom.id}`
        const text = `${mushroom.title} – pozri si tento hríbik na Hribiky.sk!`
        await Share.share(
            Platform.OS === 'ios'
                ? { message: text, url }
                : { message: `${text}\n${url}` }
        )
    }

    const navigateTo = () => {
        const { latitude, longitude } = mushroom
        const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
        const appleUrl = `maps://maps.apple.com/?daddr=${latitude},${longitude}`

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options: ['Zrušiť', 'Google Maps', 'Apple Maps'], cancelButtonIndex: 0 },
                index => {
                    if (index === 1) Linking.openURL(googleUrl)
                    if (index === 2) Linking.openURL(appleUrl)
                }
            )
        } else {
            Alert.alert('Navigácia', 'Vyber aplikáciu', [
                { text: 'Google Maps', onPress: () => Linking.openURL(googleUrl) },
                { text: 'Zrušiť', style: 'cancel' },
            ])
        }
    }

    return (
        <ScrollView style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backText}>← Späť</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareBtn} onPress={shareMushr}>
                    <Text style={styles.shareText}>Zdieľať</Text>
                </TouchableOpacity>
            </View>

            {/* Fotky */}
            {mushroom.photos?.length > 0 && (
                <View>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={e => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / width)
                            setActivePhoto(index)
                        }}
                        scrollEventThrottle={16}
                    >
                        {mushroom.photos.map((photo, i) => (
                            <Image
                                key={i}
                                source={{ uri: photo }}
                                style={styles.photo}
                                onError={() => console.log('Chyba fotky:', photo)}
                            />
                        ))}
                    </ScrollView>

                    {mushroom.photos?.length > 1 && (
                        <View style={styles.dots}>
                            {mushroom.photos.map((_, i) => (
                                <View
                                    key={i}
                                    style={[styles.dot, i === activePhoto && styles.dotActive]}
                                />
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Info */}
            <View style={styles.body}>
                <Text style={styles.title}>{mushroom.title}</Text>

                {mushroom.description && (
                    <Text style={styles.description}>{mushroom.description}</Text>
                )}

                <Text style={styles.attribution}>
                    Pridal {mushroom.name || 'neznámy'}, dňa {date}.
                </Text>

                <TouchableOpacity style={styles.gpsBtn} onPress={navigateTo}>
                    <Text style={styles.gpsBtnText}>
                        📍 {mushroom.latitude.toFixed(5)}, {mushroom.longitude.toFixed(5)}
                        {mushroom.altitude ? `  ·  ⛰ ${mushroom.altitude} m n.m.` : ''}
                    </Text>
                    <Text style={styles.gpsBtnHint}>Ťukni pre navigáciu</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    photo: { width, height: 280, resizeMode: 'cover' },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#ccc',
    },
    dotActive: {
        backgroundColor: '#3B6D11',
    },
    body: {
        padding: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '500',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    description: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
        marginBottom: 16,
    },
    attribution: {
        fontSize: 13,
        color: '#888',
        marginBottom: 16,
    },
    gpsBtn: {
        padding: 14,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        borderWidth: 0.5,
        borderColor: '#ddd',
    },
    gpsBtnText: {
        fontSize: 13,
        color: '#333',
        marginBottom: 4,
    },
    gpsBtnHint: {
        fontSize: 12,
        color: '#3B6D11',
        fontWeight: '500',
    },
    backBtn: {
        padding: 16,
        paddingTop: 56,
        backgroundColor: '#fff',
    },
    backText: {
        fontSize: 15,
        color: '#3B6D11',
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 16,
    },
    shareBtn: {
        paddingTop: 56,
        padding: 16,
    },
    shareText: {
        fontSize: 15,
        color: '#3B6D11',
        fontWeight: '500',
    },
})