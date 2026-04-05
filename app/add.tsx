import { useState, useEffect } from 'react'
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    ScrollView, Image, ActivityIndicator, Alert
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import NetInfo from '@react-native-community/netinfo'
import { addToQueue, sendQueuedMushrooms } from '../utils/offlineQueue'

const API_URL = process.env.EXPO_PUBLIC_API_URL!
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!

// Rozlíši SK vs CZ podľa súradníc – bez API volania
function detectCountry(lat: number, lon: number): 'SK' | 'CZ' {
    if (lon > 18.1) return 'SK'
    if (lon < 16.9) return 'CZ'
    // Prekrývajúca zóna ~16.9–18.1: severnejšie = CZ, južnejšie = SK
    return lat > 49.2 ? 'CZ' : 'SK'
}

export default function AddScreen() {
    const { t } = useTranslation()
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [email, setEmail] = useState('')
    const [photos, setPhotos] = useState<string[]>([])
    const [location, setLocation] = useState<{ latitude: number, longitude: number, altitude: number | null } | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [country, setCountry] = useState<'SK' | 'CZ'>('SK')

    useEffect(() => {
        (async () => {
            // Načítaj uložené meno a email
            const savedName = await AsyncStorage.getItem('user_name')
            const savedEmail = await AsyncStorage.getItem('user_email')
            if (savedName) setName(savedName)
            if (savedEmail) setEmail(savedEmail)

            // GPS
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                Alert.alert('GPS', t('common.gpsPermission'))
                return
            }
            const loc = await Location.getCurrentPositionAsync({})
            setLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                altitude: loc.coords.altitude,
            })

            setCountry(detectCountry(loc.coords.latitude, loc.coords.longitude))
        })()
    }, [])

    const pickPhoto = async () => {
        if (photos.length >= 5) return

        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert('', t('common.cameraPermission'))
            return
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.7,
        })

        if (!result.canceled) {
            const manipulated = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            )
            setPhotos(prev => [...prev, manipulated.uri])
        }
    }

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index))
    }

    const submit = async () => {
        console.log('submit called')
        console.log('title:', title)
        console.log('location:', location)

        if (!title.trim()) {
            Alert.alert('Chyba', t('add.errorTitle'))
            return
        }
        if (!name.trim()) {
            Alert.alert('Chyba', t('add.errorName'))
            return
        }
        if (!location) {
            Alert.alert('Chyba', t('add.errorGps'))
            return
        }

        setSubmitting(true)

        try {
            await AsyncStorage.setItem('user_name', name)
            if (email.trim()) await AsyncStorage.setItem('user_email', email)

            const netState = await NetInfo.fetch()
            const isOnline = netState.isConnected && netState.isInternetReachable

            if (!isOnline) {
                // Uložíme do queue
                await addToQueue({
                    title,
                    name,
                    description,
                    email: email.trim() || undefined,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    altitude: location.altitude ?? undefined,
                    country,
                    photos,
                })

                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)

                Alert.alert(
                    'Uložené offline',
                    'Nemáš internetové pripojenie. Hríbik sme uložili a odošleme ho automaticky keď budeš online.',
                    [{ text: 'OK', onPress: () => router.back() }]
                )
                return
            }

            // Online – odošleme normálne
            const formData = new FormData()
            formData.append('title', title)
            formData.append('name', name)
            formData.append('description', description)
            formData.append('latitude', String(location.latitude))
            formData.append('longitude', String(location.longitude))
            formData.append('country', country)
            if (location.altitude) formData.append('altitude', String(location.altitude))
            if (email.trim()) formData.append('email', email)

            photos.forEach((uri, i) => {
                const filename = uri.split('/').pop() ?? `photo_${i}.jpg`
                const match = /\.(\w+)$/.exec(filename)
                const type = match ? `image/${match[1]}` : 'image/jpeg'
                formData.append('photos[]', { uri, name: filename, type } as any)
            })

            const res = await fetch(`${API_URL}/mushrooms`, {
                method: 'POST',
                headers: { 'Api-Key': API_KEY },
                body: formData,
            })

            console.log('Status:', res.status)
            const data = await res.json()
            console.log('Response:', data)

            if (res.ok && data.status !== 'error') {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                Alert.alert(t('add.success'), t('add.successMessage'), [
                    { text: t('add.successButton'), onPress: () => router.back() }
                ])
            } else {
                Alert.alert('Chyba', data.message ?? t('add.errorGeneral'))
            }
        } catch (e) {
            Alert.alert('Chyba', t('add.errorConnection'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backText}>{t('common.back')}</Text>
            </TouchableOpacity>

            <Text style={styles.heading}>{t('add.title')}</Text>

            {/* GPS badge */}
            <View style={styles.gpsBadge}>
                <View style={[styles.gpsDot, location ? styles.gpsDotActive : styles.gpsDotWaiting]} />
                <Text style={styles.gpsText}>
                    {location
                        ? `GPS: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                        : t('add.gpsWaiting')}
                </Text>
            </View>

            {/* Fotky */}
            <Text style={styles.label}>{t('add.photos')} <Text style={styles.optional}>{t('add.photosMax')}</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                {photos.map((uri, i) => (
                    <TouchableOpacity key={i} onPress={() => removePhoto(i)} style={styles.photoThumb}>
                        <Image source={{ uri }} style={styles.photoImage} />
                        <View style={styles.photoRemove}>
                            <Text style={styles.photoRemoveText}>×</Text>
                        </View>
                    </TouchableOpacity>
                ))}
                {photos.length < 5 && (
                    <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
                        <Text style={styles.photoAddText}>+</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Formulár */}
            <Text style={styles.label}>{t('add.mushroomTitle')} {t('add.nameRequired')}</Text>
            <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('add.placeholderTitle')}
                placeholderTextColor="#aaa"
            />

            <Text style={styles.label}>{t('add.name')} {t('add.nameRequired')}</Text>
            <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('add.placeholderName')}
                placeholderTextColor="#aaa"
            />

            <Text style={styles.label}>{t('add.description')}</Text>
            <TextInput
                style={[styles.input, styles.textarea]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('add.placeholderDescription')}
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={4}
            />

            <Text style={styles.label}>{t('add.email')} <Text style={styles.optional}>{t('add.emailOptional')}</Text></Text>
            <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('add.placeholderEmail')}
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={submit}
                disabled={submitting}
            >
                {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.submitText}>{t('add.submit')}</Text>
                }
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    backBtn: { padding: 16, paddingTop: 56 },
    backText: { fontSize: 15, color: '#3B6D11', fontWeight: '500' },
    heading: { fontSize: 24, fontWeight: '500', color: '#1a1a1a', paddingHorizontal: 16, marginBottom: 16 },
    gpsBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 16, marginBottom: 20,
        padding: 10, backgroundColor: '#EAF3DE',
        borderRadius: 8,
    },
    gpsDot: { width: 8, height: 8, borderRadius: 4 },
    gpsDotActive: { backgroundColor: '#3B6D11' },
    gpsDotWaiting: { backgroundColor: '#aaa' },
    gpsText: { fontSize: 12, color: '#3B6D11' },
    label: { fontSize: 13, fontWeight: '500', color: '#333', marginHorizontal: 16, marginBottom: 6 },
    optional: { fontSize: 12, color: '#aaa', fontWeight: '400' },
    photoRow: { paddingHorizontal: 16, marginBottom: 20 },
    photoThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8, position: 'relative' },
    photoImage: { width: 80, height: 80, borderRadius: 8 },
    photoRemove: {
        position: 'absolute', top: -6, right: -6,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#e24b4a', alignItems: 'center', justifyContent: 'center',
    },
    photoRemoveText: { color: '#fff', fontSize: 14, lineHeight: 18 },
    photoAdd: {
        width: 80, height: 80, borderRadius: 8,
        borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center',
    },
    photoAddText: { fontSize: 32, color: '#aaa', lineHeight: 36 },
    input: {
        marginHorizontal: 16, marginBottom: 16,
        borderWidth: 0.5, borderColor: '#ddd',
        borderRadius: 8, padding: 12,
        fontSize: 15, color: '#1a1a1a',
        backgroundColor: '#fafafa',
    },
    textarea: { height: 100, textAlignVertical: 'top' },
    submitBtn: {
        margin: 16, padding: 16,
        backgroundColor: '#3B6D11', borderRadius: 10,
        alignItems: 'center',
    },
    submitBtnDisabled: { backgroundColor: '#aaa' },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '500' },
})