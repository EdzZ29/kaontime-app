import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-context';

export default function HomeScreen() {
  const { user, isPreparing, signOut } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Bounce anyone without a session back to login (including after logout, and
  // anyone who reaches /home directly by URL on web).
  useEffect(() => {
    if (!isPreparing && !user) {
      router.replace('/login');
    }
  }, [isPreparing, user, router]);

  if (!user) {
    return <View className="flex-1 bg-white" />;
  }

  return (
    // SafeAreaView comes from react-native-safe-area-context, which NativeWind
    // does not add className support to — these must stay as style props.
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View className="flex-1 px-6 py-8">
        <View className="flex-row items-center gap-3">
          <Image
            source={require('../../assets/images/KaonTime-logo.png')}
            style={{ width: 48, height: 48 }}
            contentFit="contain"
          />
          <View>
            <Text className="text-xl font-bold text-neutral-900">
              Kaon Time
            </Text>
            <Text className="text-sm text-neutral-500">Point of sale</Text>
          </View>
        </View>

        <View className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
          <Text className="text-sm text-neutral-500">Signed in as</Text>
          <Text className="mt-1 text-lg font-semibold text-neutral-900">
            {user.fullName}
          </Text>
          <Text className="text-sm text-neutral-600">{user.email}</Text>

          <View className="mt-3 self-start rounded-full bg-neutral-900 px-3 py-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-white">
              {user.role}
            </Text>
          </View>
        </View>

        <View className="flex-1" />

        <Pressable
          onPress={async () => {
            setIsSigningOut(true);
            // Clears the token even if the request fails, so the redirect
            // above always fires.
            await signOut();
          }}
          disabled={isSigningOut}
          className={`h-12 flex-row items-center justify-center rounded-xl border ${
            isSigningOut
              ? 'border-neutral-200 bg-neutral-100'
              : 'border-neutral-300 bg-white'
          }`}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#131313" />
          ) : (
            <Text className="text-base font-semibold text-neutral-900">
              Log out
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
