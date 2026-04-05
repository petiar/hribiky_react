# Hribiky.sk – Mobile App

## O projekte
Mobilná aplikácia pre Hribiky.sk – databázu turistických rozcestníkov (tzv. "hríbikov") na Slovensku a v Česku. Aplikácia umožňuje prezerať existujúce hríbiky na mape, pridávať nové a komentovať existujúce.

## Tech stack
- **Framework**: React Native + Expo SDK 54
- **Routing**: Expo Router (file-based, `app/` adresár)
- **Mapy**: react-native-maps s PROVIDER_GOOGLE + react-native-map-clustering
- **Lokalizácia**: i18next (sk, cs, en) — všetky user-facing stringy MUSIA byť cez `t('...')`, nikdy natvrdo
- **Offline**: NetInfo + AsyncStorage offline queue (`utils/offlineQueue.ts`)
- **Fotky**: expo-image-picker + expo-image-manipulator (resize na max 1200px, quality 0.7, JPEG)
- **Backend**: Symfony API na `https://hribiky.sk/api` (env: `EXPO_PUBLIC_API_URL`)

## Štruktúra
```
app/
  index.tsx          — mapa so všetkými hríbikmi
  add.tsx            — formulár na pridanie nového hríbika
  add-comment.tsx    — formulár na pridanie komentára
  nearby.tsx         — hríbiky v okolí (presmeruje na /add ak offline)
  leaderboard.tsx    — rebríček
  mushroom/[id].tsx  — detail hríbika (fotky, popis, GPS, komentáre, lightbox)
utils/
  offlineQueue.ts    — queue pre hríbiky aj komentáre (posiela sa keď príde online)
locales/
  sk.ts, cs.ts, en.ts
```

## Dôležité konvencie
- **Preklady**: Vždy pridaj kľúč do všetkých troch locale súborov (sk, cs, en) pred použitím v kóde
- **API key**: hlavičky `{ 'Api-Key': API_KEY }` pri každom requeste
- **Fotky upload**: FormData kľúč `photos[]` (Symfony konvencia), pre komentáre `photo[]`
- **Krajina**: detekcia SK vs CZ podľa súradníc bez API (`detectCountry()` v add.tsx)
- **Mapa**: pozícia mapy sa pamätá cez module-level `lastRegion` premennú

## Markery na mape
- Individuálny marker: hríbik ikonka 30×45px, `tracksViewChanges={true}`
- Cluster marker: hríbik ikonka 50×75px + biely krúžok s čiernym číslom vpravo dole, `tracksViewChanges={true}`
- `mapRef` typovaný ako `RNMapView` z `react-native-maps` (nie z clustering knižnice)

## Offline správanie
- index.tsx: zobrazí červený banner keď offline, nenačítava API
- add.tsx / add-comment.tsx: uloží do queue, odošle automaticky keď príde online
- _layout.tsx: sleduje NetInfo a po obnovení spojenia posiela queue

## Plánované / rozpracované
- **Fallback pri zlyhaní uploadu**: keď fetch zlyhá (napr. app išla do pozadia), uložiť do offline queue namiesto error alertu
- **Hamburger menu**: presunúť Leaderboard + Privacy Policy do menu, na mape ostanú len 2 buttony
- **WebView Privacy Policy**: načítať `hribiky.sk/privacy-policy` v appke cez WebView
- **Refresh mapy pri návrate**: automatický refresh dát keď sa používateľ vráti na mapu
- **Push notifikácie**: expo-notifications + Expo Push API, token poslaný s hríbikom, backend zavolá Expo API po schválení