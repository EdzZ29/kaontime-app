import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-context';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      edges={['top']}
    >
      <View className="flex-1 px-6 py-4">
        <View className="flex-row items-center gap-3">
          <Image
            source={require('../../../assets/images/KaonTime-logo.png')}
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
            {user?.fullName}
          </Text>
          <Text className="text-sm text-neutral-600">{user?.email}</Text>

          <View className="mt-3 self-start rounded-full bg-neutral-900 px-3 py-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-white">
              {user?.role}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/change-password')}
          className="mt-4 h-12 flex-row items-center justify-between rounded-lg border border-neutral-300 px-4"
        >
          <Text className="text-base font-medium text-neutral-900">
            Change password
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#a3a3a3" />
        </Pressable>

        <View className="flex-1" />

        <Pressable
          onPress={async () => {
            setIsSigningOut(true);
            // Clears the token even if the request fails; the tabs layout then
            // redirects to /login.
            await signOut();
          }}
          disabled={isSigningOut}
          className={`h-12 flex-row items-center justify-center rounded-lg border ${
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
