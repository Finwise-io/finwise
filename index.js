// App entry. The crypto polyfill MUST load before anything else: React Native / Hermes has no
// secure random source, so CryptoJS (used for our AES encryption + key derivation) would throw
// "Native crypto module could not be used to generate random number". This provides
// global.crypto.getRandomValues. Then hand off to Expo Router's normal entry.
import 'react-native-get-random-values';
import 'expo-router/entry';
