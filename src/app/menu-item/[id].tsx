import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, resolveImageUrl, uploadImage } from '@/api/client';
import {
  createMenuItem,
  deleteMenuItem,
  getMenuItem,
  MENU_CATEGORIES,
  updateMenuItem,
} from '@/api/menu';
import { useAuth } from '@/auth/auth-context';

interface VariantRow {
  code: string;
  label: string;
  price: string;
}

interface OptionRow {
  name: string;
  amount: string;
}

export default function MenuItemFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const isNew = id === 'new';
  const itemId = isNew ? null : Number(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('0');
  const [category, setCategory] = useState<string>(MENU_CATEGORIES[0]);
  const [addOns, setAddOns] = useState<OptionRow[]>([]);
  const [flavors, setFlavors] = useState<OptionRow[]>([]);
  const [sizes, setSizes] = useState<OptionRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || itemId === null || Number.isNaN(itemId)) {
      return;
    }

    let cancelled = false;

    getMenuItem(itemId)
      .then((item) => {
        if (cancelled) return;
        setName(item.name);
        setDescription(item.description);
        setPrice(String(item.price));
        setCost(String(item.cost ?? 0));
        setCategory(item.category);
        setImageUrl(item.imageUrl);
        setAddOns(
          item.addOns.map((a) => ({ name: a.name, amount: String(a.price) })),
        );
        setFlavors(
          item.flavors.map((f) => ({
            name: f.name,
            amount: String(f.priceDelta),
          })),
        );
        setVariants(
          item.variants.map((v) => ({
            code: v.code,
            label: v.name ?? '',
            price: String(v.price),
          })),
        );
        setSizes(
          item.sizes.map((z) => ({
            name: z.name,
            amount: String(z.priceDelta),
          })),
        );
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Could not load the item.'),
      )
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [isNew, itemId]);

  // Writes are owner-only on the server too; this just hides the form.
  if (user && user.role !== 'owner') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base text-neutral-600">
            Only the owner can edit the menu.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const priceValue = Number(price);
  const canSave =
    name.trim().length > 0 &&
    price.trim().length > 0 &&
    Number.isFinite(priceValue) &&
    priceValue >= 0;

  async function handleSave() {
    if (!canSave || isSaving) return;

    setError(null);
    setIsSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: priceValue,
      cost: Number(cost) || 0,
      category: category.trim() || 'Uncategorized',
      imageUrl: imageUrl ?? undefined,
      // Blank rows are dropped rather than rejected.
      addOns: addOns
        .filter((a) => a.name.trim())
        .map((a) => ({ name: a.name.trim(), price: Number(a.amount) || 0 })),
      flavors: flavors
        .filter((f) => f.name.trim())
        .map((f) => ({
          name: f.name.trim(),
          priceDelta: Number(f.amount) || 0,
        })),
      variants: variants
        .filter((v) => v.code.trim())
        .map((v) => ({
          code: v.code.trim(),
          name: v.label.trim() || undefined,
          price: Number(v.price) || 0,
        })),
      sizes: sizes
        .filter((z) => z.name.trim())
        .map((z) => ({
          name: z.name.trim(),
          priceDelta: Number(z.amount) || 0,
        })),
    };

    try {
      if (isNew) {
        await createMenuItem(payload);
      } else {
        await updateMenuItem(itemId!, payload);
      }
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the item.');
      setIsSaving(false);
    }
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is needed to add an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      // Compressed: product thumbnails do not need full-resolution originals.
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      setImageUrl(await uploadImage(result.assets[0].uri));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not upload image.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete item', `Remove "${name}" from the menu?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMenuItem(itemId!);
            router.back();
          } catch (e) {
            setError(
              e instanceof ApiError ? e.message : 'Could not delete the item.',
            );
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#131313" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <Stack.Screen
        options={{ title: isNew ? 'New item' : 'Edit item', headerShown: false }}
      />

      <View className="flex-row items-center justify-between border-b border-neutral-100 px-5 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color="#131313" />
        </Pressable>
        <Text className="text-base font-semibold text-neutral-900">
          {isNew ? 'New item' : 'Edit item'}
        </Text>
        <Pressable onPress={handleSave} disabled={!canSave || isSaving} hitSlop={8}>
          {isSaving ? (
            <ActivityIndicator color="#131313" />
          ) : (
            <Text
              className={`text-base font-semibold ${
                canSave ? 'text-neutral-900' : 'text-neutral-300'
              }`}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          <Field label="Photo">
            <View className="flex-row items-center gap-3">
              <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-neutral-300 bg-neutral-50">
                {isUploading ? (
                  <ActivityIndicator color="#131313" />
                ) : imageUrl ? (
                  <Image
                    source={{ uri: resolveImageUrl(imageUrl)! }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="image-outline" size={26} color="#d4d4d4" />
                )}
              </View>

              <View className="flex-1 gap-2">
                <Pressable
                  onPress={pickImage}
                  disabled={isUploading}
                  className="h-11 flex-row items-center justify-center gap-1.5 rounded-lg border border-neutral-300"
                >
                  <Ionicons name="cloud-upload-outline" size={17} color="#131313" />
                  <Text className="text-sm font-semibold text-neutral-900">
                    {imageUrl ? 'Replace photo' : 'Upload photo'}
                  </Text>
                </Pressable>

                {imageUrl ? (
                  <Pressable
                    onPress={() => setImageUrl(null)}
                    className="h-9 items-center justify-center"
                  >
                    <Text className="text-sm font-medium text-red-600">
                      Remove photo
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Field>

          <Field label="Name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Pork Sisig"
              placeholderTextColor="#a3a3a3"
              className="rounded-lg border border-neutral-300 px-4 py-3.5 text-base text-neutral-900"
            />
          </Field>

          <Field label="Description">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Short description"
              placeholderTextColor="#a3a3a3"
              multiline
              className="min-h-[72px] rounded-lg border border-neutral-300 px-4 py-3.5 text-base text-neutral-900"
            />
          </Field>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="Price (₱)">
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor="#a3a3a3"
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  className="rounded-lg border border-neutral-300 px-4 py-3.5 text-base text-neutral-900"
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Cost (₱)">
                <TextInput
                  value={cost}
                  onChangeText={setCost}
                  placeholder="0.00"
                  placeholderTextColor="#a3a3a3"
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  className="rounded-lg border border-neutral-300 px-4 py-3.5 text-base text-neutral-900"
                />
              </Field>
            </View>
          </View>

          <Field label="Category">
            <View className="mb-2 flex-row flex-wrap gap-2">
              {MENU_CATEGORIES.map((preset) => {
                const active = category === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => setCategory(preset)}
                    className={`rounded-lg border px-4 py-2.5 ${
                      active
                        ? 'border-neutral-900 bg-neutral-900'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        active ? 'text-white' : 'text-neutral-700'
                      }`}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Or type a custom category"
              placeholderTextColor="#a3a3a3"
              className="rounded-lg border border-neutral-300 px-4 py-3.5 text-base text-neutral-900"
            />
          </Field>

          <VariantEditor rows={variants} onChange={setVariants} />

          <OptionEditor
            title="Sizes"
            hint="Shown as a grid on the order screen, e.g. Regular, Large"
            amountLabel="+₱"
            rows={sizes}
            onChange={setSizes}
          />

          <OptionEditor
            title="Add-ons"
            hint="Extras that cost more, e.g. Extra Rice +₱20"
            amountLabel="+₱"
            rows={addOns}
            onChange={setAddOns}
          />

          <OptionEditor
            title="Flavors"
            hint="Usually free — set an amount if a flavor costs extra"
            amountLabel="+₱"
            rows={flavors}
            onChange={setFlavors}
          />

          {!isNew ? (
            <Pressable
              onPress={handleDelete}
              className="mt-6 h-12 flex-row items-center justify-center rounded-lg border border-red-200 bg-red-50"
            >
              <Text className="text-base font-semibold text-red-700">
                Delete item
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-neutral-700">
        {label}
      </Text>
      {children}
    </View>
  );
}

/**
 * Variants carry a code and a full price (not a +₱ delta), so they get their
 * own editor rather than reusing OptionEditor.
 */
function VariantEditor({
  rows,
  onChange,
}: {
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
}) {
  const update = (index: number, patch: Partial<VariantRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <View className="mt-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-neutral-700">Variants</Text>
        <Pressable
          onPress={() => onChange([...rows, { code: '', label: '', price: '' }])}
          className="flex-row items-center gap-1"
          hitSlop={8}
        >
          <Ionicons name="add" size={16} color="#131313" />
          <Text className="text-sm font-semibold text-neutral-900">Add</Text>
        </Pressable>
      </View>
      <Text className="mb-2 text-xs text-neutral-400">
        Coded versions with their own full price, e.g. CP1 ₱69 · CPS ₱99. The
        price replaces the base price; the first one is preselected.
      </Text>

      {rows.length === 0 ? (
        <Text className="mb-3 text-sm text-neutral-400">
          None — the base price is used.
        </Text>
      ) : null}

      <View className="mb-2 gap-2">
        {rows.map((row, index) => (
          <View key={index} className="flex-row items-center gap-2">
            <TextInput
              value={row.code}
              onChangeText={(text) => update(index, { code: text })}
              placeholder="CODE"
              placeholderTextColor="#a3a3a3"
              autoCapitalize="characters"
              className="w-20 rounded-lg border border-neutral-300 px-3 py-3 text-base font-semibold text-neutral-900"
            />
            <TextInput
              value={row.label}
              onChangeText={(text) => update(index, { label: text })}
              placeholder="Label (optional)"
              placeholderTextColor="#a3a3a3"
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-3 text-base text-neutral-900"
            />
            <View className="w-24 flex-row items-center rounded-lg border border-neutral-300 px-2">
              <Text className="text-sm text-neutral-400">₱</Text>
              <TextInput
                value={row.price}
                onChangeText={(text) => update(index, { price: text })}
                placeholder="0"
                placeholderTextColor="#a3a3a3"
                keyboardType="decimal-pad"
                inputMode="decimal"
                className="flex-1 py-3 text-base text-neutral-900"
              />
            </View>
            <Pressable
              onPress={() => onChange(rows.filter((_, i) => i !== index))}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function OptionEditor({
  title,
  hint,
  amountLabel,
  rows,
  onChange,
}: {
  title: string;
  hint: string;
  amountLabel: string;
  rows: OptionRow[];
  onChange: (rows: OptionRow[]) => void;
}) {
  const update = (index: number, patch: Partial<OptionRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <View className="mt-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-neutral-700">{title}</Text>
        <Pressable
          onPress={() => onChange([...rows, { name: '', amount: '0' }])}
          className="flex-row items-center gap-1"
          hitSlop={8}
        >
          <Ionicons name="add" size={16} color="#131313" />
          <Text className="text-sm font-semibold text-neutral-900">Add</Text>
        </Pressable>
      </View>
      <Text className="mb-2 text-xs text-neutral-400">{hint}</Text>

      {rows.length === 0 ? (
        <Text className="mb-3 text-sm text-neutral-400">None yet.</Text>
      ) : null}

      <View className="mb-2 gap-2">
        {rows.map((row, index) => (
          <View key={index} className="flex-row items-center gap-2">
            <TextInput
              value={row.name}
              onChangeText={(text) => update(index, { name: text })}
              placeholder="Name"
              placeholderTextColor="#a3a3a3"
              className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base text-neutral-900"
            />
            <View className="w-28 flex-row items-center rounded-lg border border-neutral-300 px-3">
              <Text className="text-sm text-neutral-400">{amountLabel}</Text>
              <TextInput
                value={row.amount}
                onChangeText={(text) => update(index, { amount: text })}
                placeholder="0"
                placeholderTextColor="#a3a3a3"
                keyboardType="decimal-pad"
                inputMode="decimal"
                className="flex-1 py-2.5 text-base text-neutral-900"
              />
            </View>
            <Pressable
              onPress={() => onChange(rows.filter((_, i) => i !== index))}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
