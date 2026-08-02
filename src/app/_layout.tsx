import '../../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/auth/auth-context';
import { CartProvider } from '@/order/cart-context';

// Held until the cold-start reset finishes, so there is no white flash between
// the native splash and the animated one.
SplashScreen.preventAutoHideAsync();

// Set per screen rather than via `screenOptions` so a screen keeps its own
// chrome settings independently.
const SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: '#ffffff' },
} as const;

const MODAL_OPTIONS = { ...SCREEN_OPTIONS, presentation: 'modal' } as const;

/**
 * Releases the native splash once the cold-start reset finishes, whichever
 * route the app opened on — a deep link straight to /login would otherwise
 * leave it stuck on the native splash forever.
 */
function SplashGate() {
  const { isPreparing } = useAuth();

  useEffect(() => {
    if (!isPreparing) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isPreparing]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <SplashGate />
        <StatusBar style="dark" />
        <Stack>
          <Stack.Screen name="index" options={SCREEN_OPTIONS} />
          <Stack.Screen name="login" options={SCREEN_OPTIONS} />
          <Stack.Screen name="(tabs)" options={SCREEN_OPTIONS} />
          <Stack.Screen name="order-item/[id]" options={MODAL_OPTIONS} />
          <Stack.Screen name="menu-item/[id]" options={MODAL_OPTIONS} />
          <Stack.Screen name="change-password" options={MODAL_OPTIONS} />
          <Stack.Screen name="manage-products" options={SCREEN_OPTIONS} />
          <Stack.Screen name="review" options={SCREEN_OPTIONS} />
          <Stack.Screen name="checkout" options={SCREEN_OPTIONS} />
          <Stack.Screen name="receipt/[id]" options={SCREEN_OPTIONS} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
