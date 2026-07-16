# Odigma One — Mobile (Expo)

React Native app sharing the web's REST APIs and Better Auth session.
Light theme per `docs/UI_Design_Guide.md`. Screens: Login, Home
(dashboard hero + recent tasks), Tasks (filters + detail with comments
and status change), Work Log, Profile.

## Run it on your Android phone (Expo Go)

1. Install **Expo Go** from the Play Store.
2. Make sure the web server is running on this machine: `pnpm dev`
   (or `pnpm --filter web start` after a build).
3. Check `.env` — `EXPO_PUBLIC_API_URL` must be this machine's LAN IP
   (`ip -4 addr` to check). Phone and computer must be on the same WiFi.
4. Start Metro:

   ```bash
   cd mobile
   pnpm start
   ```

5. Scan the QR code with Expo Go. Sign in with your Odigma One account.

If sign-in fails with a network error, the phone can't reach
`EXPO_PUBLIC_API_URL` — re-check the IP and any firewall.

## Stack

Expo SDK 57 · expo-router · Better Auth (`@better-auth/expo`, session in
SecureStore) · TanStack Query · `@odigma/shared` Zod contracts ·
tokens in `lib/theme.ts`
