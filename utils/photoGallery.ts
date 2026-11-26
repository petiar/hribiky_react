import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as MediaLibrary from 'expo-media-library'

// Odfotené fotky ukladáme aj do galérie telefónu, aby neboli len v cache appky
// (prežijú odinštalovanie appky a dajú sa k hríbiku doplniť neskôr).
//
// Zatiaľ len iOS: na Androide saveToLibraryAsync vyžaduje READ_MEDIA_IMAGES, ktoré Google Play
// povoľuje len appkám s nutnou potrebou prístupu ku galérii (Photo and Video Permissions policy).
// Povolenia, ktoré pridáva config plugin expo-media-library, sú preto v app.config.js zablokované
// (android.blockedPermissions).
// Na iOS stačí NSPhotoLibraryAddUsageDescription, ktorý je v app.config.js.
const SAVE_TO_GALLERY_KEY = 'save_photos_to_gallery'

export const isGallerySaveSupported = Platform.OS === 'ios'

/** Predvolene zapnuté – používateľ to môže vypnúť v Nastaveniach. */
export const getSaveToGallery = async (): Promise<boolean> => {
    const raw = await AsyncStorage.getItem(SAVE_TO_GALLERY_KEY)
    return raw === null ? true : raw === 'true'
}

export const setSaveToGallery = (enabled: boolean) =>
    AsyncStorage.setItem(SAVE_TO_GALLERY_KEY, String(enabled))

/**
 * Uloží fotku do galérie, ak je to zapnuté a používateľ to povolil.
 * Nikdy nevyhodí chybu – zlyhanie ukladania nesmie zablokovať pridanie fotky.
 */
export const savePhotoToGallery = async (uri: string): Promise<void> => {
    try {
        if (!isGallerySaveSupported || !(await getSaveToGallery())) return

        // writeOnly = true: stačí povolenie len na pridávanie fotiek, nie na čítanie celej galérie.
        let permission = await MediaLibrary.getPermissionsAsync(true, ['photo'])
        if (!permission.granted && permission.canAskAgain) {
            permission = await MediaLibrary.requestPermissionsAsync(true, ['photo'])
        }
        if (!permission.granted) return

        await MediaLibrary.saveToLibraryAsync(uri)
    } catch (e) {
        console.warn('Uloženie fotky do galérie zlyhalo:', e)
    }
}
