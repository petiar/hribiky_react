import { useState, useEffect } from 'react'
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    ScrollView, Image, ActivityIndicator, Alert
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import NetInfo from '@react-native-community/netinfo'
import { addCommentToQueue } from '../utils/offlineQueue'

const API_URL = process.env.EXPO_PUBLIC_API_URL!
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!

export default function AddCommentScreen() {
    const { t } = useTranslation()
    const { id, title } = useLocalSearchParams()
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [email, setEmail] = useState('')
    const [photos, setPhotos] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        (async () => {
            const savedName = await AsyncStorage.getItem('user_name')
            const savedEmail = await AsyncStorage.getItem('user_email')
            if (savedName) setName(savedName)
            if (savedEmail) setEmail(savedEmail)
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
        if (!name.trim()) {
            Alert.alert('Chyba', t('addComment.errorName'))
            return
        }
        if (!description.trim()) {
            Alert.alert('Chyba', t('addComment.errorDescription'))
            return
        }

        setSubmitting(true)

        try {
            const netState = await NetInfo.fetch()
            const isOnline = netState.isConnected && netState.isInternetReachable

            if (!isOnline) {
                await addCommentToQueue({
                    mushroomId: String(id),
                    name,
                    description,
                    email: email.trim() || undefined,
                    photos,
                })
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                Alert.alert(
                    'Uložené offline',
                    'Nemáš internetové pripojenie. Komentár sme uložili a odošleme ho automaticky keď budeš online.',
                    [{ text: 'OK', onPress: () => router.back() }]
                )
                return
            }

            const formData = new FormData()
            formData.append('mushroom_id', String(id))
            formData.append('name', name)
            formData.append('description', description)
            formData.append('source', 'api')
            if (email.trim()) formData.append('email', email)

            photos.forEach((uri, i) => {
                const filename = uri.split('/').pop() ?? `photo_${i}.jpg`
                const match = /\.(\w+)$/.exec(filename)
                const type = match ? `image/${match[1]}` : 'image/jpeg'
                formData.append('photo[]', { uri, name: filename, type } as any)
            })

            const res = await fetch(`${API_URL}/mushrooms_comments`, {
                method: 'POST',
                headers: { 'Api-Key': API_KEY },
                body: formData,
            })

            const data = await res.json()

            if (res.ok && data.status !== 'error') {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                await AsyncStorage.setItem('user_name', name)
                if (email.trim()) await AsyncStorage.setItem('user_email', email)
                Alert.alert(t('addComment.success'), t('addComment.successMessage'), [
                    { text: t('addComment.successButton'), onPress: () => router.push('/') }
                ])
            } else {
                Alert.alert('Chyba', data.message ?? t('addComment.errorGeneral'))
            }
        } catch (e) {
            Alert.alert('Chyba', t('addComment.errorConnection'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backText}>{t('common.back')}</Text>
            </TouchableOpacity>

            <Text style={styles.heading}>{t('addComment.title')}</Text>
            <Text style={styles.subheading}>{title}</Text>

            <Text style={styles.label}>{t('addComment.name')} {t('addComment.nameRequired')}</Text>
            <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('add.placeholderName')}
                placeholderTextColor="#aaa"
            />

            <Text style={styles.label}>{t('addComment.description')} {t('addComment.descriptionRequired')}</Text>
            <TextInput
                style={[styles.input, styles.textarea]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('addComment.placeholderDescription')}
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={4}
            />

            <Text style={styles.label}>{t('addComment.email')} <Text style={styles.optional}>{t('addComment.emailOptional')}</Text></Text>
            <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('add.placeholderEmail')}
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <Text style={styles.label}>{t('addComment.photos')} <Text style={styles.optional}>{t('addComment.photosMax')}</Text></Text>
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

            <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={submit}
                disabled={submitting}
            >
                {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.submitText}>{t('addComment.submit')}</Text>
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
    heading: { fontSize: 24, fontWeight: '500', color: '#1a1a1a', paddingHorizontal: 16, marginBottom: 4 },
    subheading: { fontSize: 15, color: '#3B6D11', paddingHorizontal: 16, marginBottom: 20 },
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