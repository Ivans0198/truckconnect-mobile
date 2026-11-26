import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { connectAppFocus } from "@/api/app-focus";
import { queryClient } from "@/api/query-client";
import { restoreSession } from "@/auth/restore-session";
import { useSessionStore } from "@/auth/session-store";

// La splash sigue a la vista hasta tener fuentes y saber si hay sesión: así el
// conductor con sesión guardada nunca ve un destello del login.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout(): React.JSX.Element | null {
  const isSignedIn = useSessionStore((s) => s.session.status === "signedIn");
  const isRestoring = useSessionStore((s) => s.session.status === "restoring");
  // Inter viaja dentro de la app: nada de CDN, que en un dock sin señal no carga.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const isReady = (fontsLoaded || fontError) && !isRestoring;

  useEffect(() => {
    // Solo la primera vez: si la sesión ya se resolvió, no hay nada que leer.
    if (useSessionStore.getState().session.status === "restoring") {
      void restoreSession();
    }
  }, []);

  useEffect(() => connectAppFocus(), []);

  useEffect(() => {
    if (isReady) void SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
