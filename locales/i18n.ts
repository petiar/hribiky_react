import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import sk from './sk'
import cs from './cs'
import en from './en'

const languageCode = getLocales()[0]?.languageCode ?? 'en'

i18n
    .use(initReactI18next)
    .init({
        resources: {
            sk: { translation: sk },
            cs: { translation: cs },
            en: { translation: en },
        },
        lng: ['sk', 'cs'].includes(languageCode) ? languageCode : 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    })

export default i18n