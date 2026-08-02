import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { changePassword } from '@/api/auth';
import { ApiError } from '@/api/client';
import { PasswordInput } from '@/components/password-input';

const MIN_LENGTH = 8;

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const sameAsCurrent = next.length > 0 && next === current;

  const canSave =
    current.length > 0 &&
    next.length >= MIN_LENGTH &&
    confirm === next &&
    !sameAsCurrent &&
    !isSaving;

  async function handleSave() {
    if (!canSave) return;

    setError(null);
    setIsSaving(true);

    try {
      await changePassword(current, next);
      setIsDone(true);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not change the password.',
      );
      setIsSaving(false);
    }
  }

  if (isDone) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <Ionicons name="checkmark" size={30} color="#047857" />
          </View>
          <Text className="mt-3 text-xl font-bold text-neutral-900">
            Password updated
          </Text>
          <Text className="mt-1 text-center text-sm text-neutral-500">
            Use your new password the next time you sign in.
          </Text>

          <Pressable
            onPress={() => router.back()}
            className="mt-8 h-12 w-full flex-row items-center justify-center rounded-lg bg-neutral-900"
          >
            <Text className="text-base font-semibold text-white">Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View className="flex-row items-center justify-between border-b border-neutral-100 px-5 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color="#131313" />
        </Pressable>
        <Text className="text-base font-semibold text-neutral-900">
          Change password
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View className="mb-4 rounded-lg bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          <Field label="Current password">
            <PasswordInput
              value={current}
              onChangeText={setCurrent}
              placeholder="••••••••"
              autoComplete="current-password"
              editable={!isSaving}
            />
          </Field>

          <Field
            label="New password"
            hint={`At least ${MIN_LENGTH} characters`}
            error={
              tooShort
                ? `Must be at least ${MIN_LENGTH} characters.`
                : sameAsCurrent
                  ? 'Must be different from your current password.'
                  : null
            }
          >
            <PasswordInput
              value={next}
              onChangeText={setNext}
              placeholder="••••••••"
              autoComplete="new-password"
              editable={!isSaving}
            />
          </Field>

          <Field
            label="Confirm new password"
            error={mismatch ? 'Passwords do not match.' : null}
          >
            <PasswordInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              autoComplete="new-password"
              editable={!isSaving}
              returnKeyType="go"
              onSubmitEditing={handleSave}
            />
          </Field>
        </ScrollView>

        <View className="border-t border-neutral-100 px-5 pb-2 pt-3">
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            className={`h-14 flex-row items-center justify-center rounded-lg ${
              canSave ? 'bg-neutral-900' : 'bg-neutral-300'
            }`}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Update password
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-neutral-700">
        {label}
      </Text>
      {children}
      {error ? (
        <Text className="mt-1.5 text-xs text-red-600">{error}</Text>
      ) : hint ? (
        <Text className="mt-1.5 text-xs text-neutral-400">{hint}</Text>
      ) : null}
    </View>
  );
}
