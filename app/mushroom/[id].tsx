import { useEffect, useState } from 'react'
import {
    StyleSheet, View, Text, Image, ScrollView,
    ActivityIndicator, TouchableOpacity, Dimensions, Share,
    Linking, ActionSheetIOS, Alert, Platform, Modal, StatusBar
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

const API_URL = process.env.EXPO_PUBLIC_API_URL!
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!

const { width } = Dimensions.get('window')

type Comment = {
    id: number
    name: string
    description: string
    photos: string[]
    createdAt: string
}

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
    comments?: Comment[]
}

export default function MushroomDetail() {
    const { t, i18n } = useTranslation()
    const { id } = useLocalSearchParams()
    const router = useRouter()
    const [mushroom, setMushroom] = useState<Mushroom | null>(null)
    const [loading, setLoading] = useState(true)
    const [activePhoto, setActivePhoto] = useState(0)
    const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([])
    const [lightboxIndex, setLightboxIndex] = useState(0)
    const [lightboxVisible, setLightboxVisible] = useState(false)

    const openLightbox = (photos: string[], index: number) => {
        setLightboxPhotos(photos)
        setLightboxIndex(index)
        setLightboxVisible(true)
    }

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
            <View style={styles.notFoundContainer}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backText}>{t('detail.back')}</Text>
                </TouchableOpacity>
                <View style={styles.center}>
                    <Text style={styles.notFoundText}>{t('detail.notFound')}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => {
                        setLoading(true)
                        fetch(`${API_URL}/mushrooms/${id}/`, { headers: { 'Api-Key': API_KEY } })
                            .then(res => res.json())
                            .then(data => setMushroom(data))
                            .catch(err => console.error('API error:', err))
                            .finally(() => setLoading(false))
                    }}>
                        <Text style={styles.retryText}>{t('detail.retry')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    const date = new Date(mushroom.createdAt).toLocaleDateString(i18n.language, {
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
        <>
        <ScrollView style={styles.container}>

            {/* Fotky s overlay tlačidlami */}
            {mushroom.photos?.length > 0 ? (
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
                            <TouchableOpacity key={i} onPress={() => openLightbox(mushroom.photos, i)} activeOpacity={0.9}>
                                <Image
                                    source={{ uri: photo }}
                                    style={styles.photo}
                                    onError={() => console.log('Chyba fotky:', photo)}
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.photoOverlay}>
                        <TouchableOpacity style={styles.overlayBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back-circle-outline" size={34} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.overlayBtn} onPress={shareMushr}>
                            <Ionicons name="share-outline" size={30} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.photoGradient}
                    >
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
                        <Text style={styles.photoTitle}>{mushroom.title}</Text>
                    </LinearGradient>
                </View>
            ) : (
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back-circle-outline" size={30} color="#3B6D11" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shareBtn} onPress={shareMushr}>
                        <Ionicons name="share-outline" size={30} color="#3B6D11" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Info */}
            <View style={styles.body}>
                {mushroom.description && (
                    <Text style={styles.description}>{mushroom.description}</Text>
                )}

                <Text style={styles.attribution}>
                    {t('detail.commentBy', { name: mushroom.name || 'neznámy', date })}
                </Text>

                <TouchableOpacity style={styles.gpsBtn} onPress={navigateTo}>
                    <Text style={styles.gpsBtnText}>
                        <Ionicons name="location-outline" size={20} color="#3B6D11" /> {mushroom.latitude.toFixed(5)}, {mushroom.longitude.toFixed(5)}
                        {mushroom.altitude ? <>{'  ·  '}<Ionicons name="analytics-outline" size={20} color="#3B6D11" />{` ${t('detail.altitude', { value: Math.round(mushroom.altitude) })}`}</> : null}
                    </Text>
                    <Text style={styles.gpsBtnHint}>{t('detail.navigateHint')}</Text>
                </TouchableOpacity>
            </View>

            {/* Komentáre */}
            {mushroom.comments && mushroom.comments.length > 0 && (
                <View style={styles.commentsSection}>
                    <Text style={styles.commentsTitle}>{t('detail.commentsTitle')}</Text>
                    {[...mushroom.comments].reverse().map(comment => {
                        const commentDate = new Date(comment.createdAt).toLocaleDateString(i18n.language, {
                            day: 'numeric', month: 'long', year: 'numeric',
                        })
                        return (
                            <View key={comment.id} style={styles.commentCard}>
                                {comment.photos?.length > 0 && (
                                    <TouchableOpacity onPress={() => openLightbox(comment.photos, 0)} activeOpacity={0.9}>
                                        <Image
                                            source={{ uri: comment.photos[0] }}
                                            style={styles.commentPhoto}
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                )}
                                {comment.description && (
                                    <Text style={styles.commentText}>{comment.description}</Text>
                                )}
                                <Text style={styles.commentMeta}>
                                    {t('detail.commentBy', { name: comment.name || 'neznámy', date: commentDate })}
                                </Text>
                            </View>
                        )
                    })}
                </View>
            )}

        </ScrollView>

        <Modal visible={lightboxVisible} transparent animationType="fade" onRequestClose={() => setLightboxVisible(false)}>
            <StatusBar hidden />
            <View style={styles.lightboxBg}>
                <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxVisible(false)}>
                    <Text style={styles.lightboxCloseText}>✕</Text>
                </TouchableOpacity>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    contentOffset={{ x: lightboxIndex * width, y: 0 }}
                    onScroll={e => setLightboxIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                    scrollEventThrottle={16}
                >
                    {lightboxPhotos.map((photo, i) => (
                        <Image
                            key={i}
                            source={{ uri: photo }}
                            style={styles.lightboxPhoto}
                            resizeMode="contain"
                        />
                    ))}
                </ScrollView>
                {lightboxPhotos.length > 1 && (
                    <View style={styles.lightboxDots}>
                        {lightboxPhotos.map((_, i) => (
                            <View key={i} style={[styles.dot, i === lightboxIndex && styles.dotActive]} />
                        ))}
                    </View>
                )}
            </View>
        </Modal>
        </>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    notFoundContainer: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    notFoundText: { fontSize: 17, color: '#555', marginBottom: 20 },
    retryBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#3B6D11',
        borderRadius: 10,
    },
    retryText: { color: '#fff', fontSize: 15, fontWeight: '500' },
    photo: { width, height: 340, resizeMode: 'cover' },
    photoGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    photoTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: '#fff',
    },
    photoOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 56,
        paddingHorizontal: 12,
    },
    overlayBtn: {
        padding: 6,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 8,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dotActive: {
        backgroundColor: '#fff',
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
    commentsSection: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        borderTopWidth: 0.5,
        borderTopColor: '#eee',
        marginTop: 8,
    },
    commentsTitle: {
        fontSize: 17,
        fontWeight: '500',
        color: '#1a1a1a',
        marginTop: 20,
        marginBottom: 16,
    },
    commentCard: {
        marginBottom: 16,
        borderWidth: 0.5,
        borderColor: '#ddd',
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#fafafa',
    },
    commentPhoto: {
        width: '100%',
        height: 180,
    },
    commentText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        padding: 12,
        paddingBottom: 6,
    },
    commentMeta: {
        fontSize: 12,
        color: '#888',
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    lightboxBg: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    lightboxClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    lightboxCloseText: {
        color: '#fff',
        fontSize: 22,
    },
    lightboxPhoto: {
        width,
        height: '100%',
    },
    lightboxDots: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
        alignSelf: 'center',
        gap: 6,
    },
})