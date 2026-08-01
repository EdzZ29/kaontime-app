import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      router.replace('/home');
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Something went wrong. Try again.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    // SafeAreaView comes from react-native-safe-area-context, which NativeWind
    // does not add className support to — these must stay as style props.
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center">
            <Image
              source={require('../../assets/images/KaonTime-logo.png')}
              style={{ width: 140, height: 140 }}
              contentFit="contain"
            />
          </View>

          <Text className="mt-6 text-center text-2xl font-bold text-neutral-900">
            Sign in
          </Text>
          <Text className="mt-1 text-center text-sm text-neutral-500">
            Use your Kaon Time account
          </Text>

          <View className="mt-8 gap-4">
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-neutral-700">
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@kaontime.local"
                placeholderTextColor="#a3a3a3"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                inputMode="email"
                editable={!isSubmitting}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900"
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-sm font-medium text-neutral-700">
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#a3a3a3"
                autoCapitalize="none"
                autoComplete="current-password"
                secureTextEntry
                editable={!isSubmitting}
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900"
              />
            </View>

            {error ? (
              <View className="rounded-xl bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`mt-2 h-12 flex-row items-center justify-center rounded-xl ${
                !canSubmit || isSubmitting ? 'bg-neutral-300' : 'bg-neutral-900'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  Sign in
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
