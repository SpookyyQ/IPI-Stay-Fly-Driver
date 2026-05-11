import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import esMx from './locales/es-MX.json'
import fr from './locales/fr.json'
import it from './locales/it.json'
import pl from './locales/pl.json'
import pt from './locales/pt.json'
import zh from './locales/zh.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
      es: { translation: es },
      'es-MX': { translation: esMx },
      fr: { translation: fr },
      it: { translation: it },
      pl: { translation: pl },
      pt: { translation: pt },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export default i18n
