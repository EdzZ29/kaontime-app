import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { ApiError, resolveImageUrl } from '@/api/client';
import { formatPeso, getMenuItem, type MenuItem } from '@/api/menu';
import { DELIVERY_FEE, ORDER_SOURCES, SERVICE_TYPES } from '@/api/orders';
import { StepIndicator } from '@/components/step-indicator';
import { useCart } from '@/order/cart-context';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    addLine,
    customerName,
    setCustomerName,
    orderSource,
    setOrderSource,
    serviceType,
    setServiceType,
  } = useCart();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [variantId, setVariantId] = useState<number | null>(null);
  const [sizeId, setSizeId] = useState<number | null>(null);
  const [flavorId, setFlavorId] = useState<number | null>(null);
  const [addOnIds, setAddOnIds] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      setError('Unknown item.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    getMenuItem(numericId)
      .then((loaded) => {
        if (cancelled) return;
        setItem(loaded);
        // Preselect when there is no real choice to make.
        const variants = loaded.variants.filter((v) => v.isAvailable);
        if (variants.length > 0) setVariantId(variants[0].id);
        const sizes = loaded.sizes.filter((z) => z.isAvailable);
        if (sizes.length === 1) setSizeId(sizes[0].id);
        const flavors = loaded.flavors.filter((f) => f.isAvailable);
        if (flavors.length === 1) setFlavorId(flavors[0].id);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Could not load the item.'),
      )
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#131313" />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base text-neutral-600">
            {error ?? 'Item not found.'}
          </Text>
          <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2">
            <Text className="font-semibold text-neutral-900">Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const variants = item.variants.filter((v) => v.isAvailable);
  const sizes = item.sizes.filter((z) => z.isAvailable);
  const flavors = item.flavors.filter((f) => f.isAvailable);
  const addOns = item.addOns.filter((a) => a.isAvailable);

  const chosenVariant = variants.find((v) => v.id === variantId) ?? null;
  const chosenSize = sizes.find((z) => z.id === sizeId) ?? null;
  const chosenFlavor = flavors.find((f) => f.id === flavorId) ?? null;
  const chosenAddOns = addOns.filter((a) => addOnIds.includes(a.id));
  const unit =
    (chosenVariant?.price ?? item.price) +
    (chosenSize?.priceDelta ?? 0) +
    (chosenFlavor?.priceDelta ?? 0) +
    chosenAddOns.reduce((sum, a) => sum + a.price, 0);
  const runningTotal = Math.round(unit * quantity * 100) / 100;

  // Only required when the item actually offers a choice.
  const needsVariant = variants.length > 0 && variantId === null;
  const needsSize = sizes.length > 0 && sizeId === null;
  const needsFlavor = flavors.length > 0 && flavorId === null;
  const canAdd = !needsVariant && !needsSize && !needsFlavor;

  const toggleAddOn = (addOnId: number) =>
    setAddOnIds((current) =>
      current.includes(addOnId)
        ? current.filter((x) => x !== addOnId)
        : [...current, addOnId],
    );

  /** Step 1 done: add the line, then move on to step 2. */
  function handleNext() {
    if (!canAdd) return;
    addLine(item!, { quantity, sizeId, variantId, flavorId, addOnIds, note });
    router.replace('/review');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View className="flex-row items-center justify-between border-b border-neutral-100 px-5 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color="#131313" />
        </Pressable>
        <Text className="text-base font-semibold text-neutral-900">
          Order details
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <StepIndicator current={1} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="h-36 items-center justify-center overflow-hidden rounded-2xl bg-neutral-100">
            {resolveImageUrl(item.imageUrl) ? (
              <Image
                source={{ uri: resolveImageUrl(item.imageUrl)! }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="restaurant-outline" size={36} color="#d4d4d4" />
            )}
          </View>

          <View className="mt-4 flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xl font-bold text-neutral-900">
                {item.name}
              </Text>
              {item.description ? (
                <Text className="mt-1 text-sm text-neutral-500">
                  {item.description}
                </Text>
              ) : null}
            </View>
            <Text className="text-xl font-bold text-neutral-900">
              {formatPeso(item.price)}
            </Text>
          </View>


          {variants.length > 0 ? (
            <Section title="Variant" hint="Choose one">
              {/* Each variant sets the price outright, so show the full price. */}
              <View className="flex-row flex-wrap gap-2">
                {variants.map((variant) => {
                  const active = variantId === variant.id;
                  return (
                    <Pressable
                      key={variant.id}
                      onPress={() => setVariantId(variant.id)}
                      style={{ width: '48%' }}
                      className={`items-center rounded-lg border px-3 py-4 ${
                        active
                          ? 'border-neutral-900 bg-neutral-900'
                          : 'border-neutral-300 bg-white'
                      }`}
                    >
                      <Text
                        className={`text-base font-bold tracking-wide ${
                          active ? 'text-white' : 'text-neutral-900'
                        }`}
                      >
                        {variant.code}
                      </Text>
                      {variant.name ? (
                        <Text
                          className={`text-[11px] ${
                            active ? 'text-neutral-300' : 'text-neutral-500'
                          }`}
                        >
                          {variant.name}
                        </Text>
                      ) : null}
                      <Text
                        className={`mt-0.5 text-sm font-semibold ${
                          active ? 'text-white' : 'text-neutral-700'
                        }`}
                      >
                        {formatPeso(variant.price)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          ) : null}

          {sizes.length > 0 ? (
            <Section title="Size" hint="Choose one">
              {/* Grid of size tiles, two per row. */}
              <View className="flex-row flex-wrap gap-2">
                {sizes.map((size) => {
                  const active = sizeId === size.id;
                  return (
                    <Pressable
                      key={size.id}
                      onPress={() => setSizeId(size.id)}
                      style={{ width: '48%' }}
                      className={`items-center rounded-lg border px-3 py-4 ${
                        active
                          ? 'border-neutral-900 bg-neutral-900'
                          : 'border-neutral-300 bg-white'
                      }`}
                    >
                      <Text
                        className={`text-base font-semibold ${
                          active ? 'text-white' : 'text-neutral-900'
                        }`}
                      >
                        {size.name}
                      </Text>
                      <Text
                        className={`mt-0.5 text-xs ${
                          active ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      >
                        {size.priceDelta > 0
                          ? `+${formatPeso(size.priceDelta)}`
                          : formatPeso(item.price)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          ) : null}

          {flavors.length > 0 ? (
            <Section title="Flavor" hint="Choose one">
              <View className="gap-2">
                {flavors.map((flavor) => (
                  <SelectRow
                    key={flavor.id}
                    label={flavor.name}
                    amount={flavor.priceDelta}
                    selected={flavorId === flavor.id}
                    shape="radio"
                    onPress={() => setFlavorId(flavor.id)}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          {addOns.length > 0 ? (
            <Section title="Add-ons" hint="Optional, choose any">
              <View className="gap-2">
                {addOns.map((addOn) => (
                  <SelectRow
                    key={addOn.id}
                    label={addOn.name}
                    amount={addOn.price}
                    selected={addOnIds.includes(addOn.id)}
                    shape="checkbox"
                    onPress={() => toggleAddOn(addOn.id)}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          <Section title="Order type">
            <View className="gap-2">
              <ChoiceRow
                options={ORDER_SOURCES}
                value={orderSource}
                onChange={setOrderSource}
              />
              <ChoiceRow
                options={SERVICE_TYPES}
                value={serviceType}
                onChange={setServiceType}
                // Only delivery carries a surcharge.
                badges={{ delivery: `+${formatPeso(DELIVERY_FEE)}` }}
              />
            </View>
          </Section>

          <Section title="Customer name" hint="Optional">
            <TextInput
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Who is this order for?"
              placeholderTextColor="#a3a3a3"
              className="rounded-lg border border-neutral-300 px-4 py-3.5 text-base text-neutral-900"
            />
          </Section>

          <Section title="Note" hint="Optional">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. no onions, extra sauce on the side"
              placeholderTextColor="#a3a3a3"
              multiline
              maxLength={200}
              className="min-h-[80px] rounded-lg border border-neutral-300 px-4 py-3.5 text-base text-neutral-900"
            />
          </Section>

          <Section title="Quantity">
            <View className="flex-row items-center gap-4">
              <Stepper
                icon="remove"
                disabled={quantity <= 1}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              />
              <Text className="min-w-8 text-center text-lg font-semibold text-neutral-900">
                {quantity}
              </Text>
              <Stepper
                icon="add"
                disabled={quantity >= 99}
                onPress={() =>
                  setQuantity((q) => Math.min(99, q + 1))
                }
              />
            </View>
          </Section>

          <View className="mt-8 rounded-lg bg-neutral-50 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-neutral-900">
                Line total
              </Text>
              <Text className="text-lg font-bold text-neutral-900">
                {formatPeso(runningTotal)}
              </Text>
            </View>
          </View>

          {needsVariant || needsSize || needsFlavor ? (
            <Text className="mt-3 text-center text-sm text-neutral-500">
              Choose a{' '}
              {needsVariant ? 'variant' : needsSize ? 'size' : 'flavor'} to continue
            </Text>
          ) : null}
        </ScrollView>

        {/* Same bottom action bar as the review and payment steps. */}
        <View className="border-t border-neutral-100 px-5 pb-2 pt-3">
          <Pressable
            onPress={handleNext}
            disabled={!canAdd}
            className={`h-14 flex-row items-center justify-between rounded-lg px-5 ${
              canAdd ? 'bg-neutral-900' : 'bg-neutral-300'
            }`}
          >
            <Text className="text-base font-semibold text-white">
              Continue to review
            </Text>
            <Text className="text-base font-semibold text-white">
              {formatPeso(runningTotal)}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Segmented row of mutually exclusive choices. */
function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
  badges,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  badges?: Partial<Record<T, string>>;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const active = value === option.value;
        const badge = badges?.[option.value];

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-lg border px-2 py-3 ${
              active
                ? 'border-neutral-900 bg-neutral-900'
                : 'border-neutral-300 bg-white'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                active ? 'text-white' : 'text-neutral-700'
              }`}
            >
              {option.label}
            </Text>
            {badge ? (
              <Text
                className={`text-[10px] ${
                  active ? 'text-neutral-300' : 'text-neutral-500'
                }`}
              >
                {badge}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-6">
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text className="text-base font-semibold text-neutral-900">
          {title}
        </Text>
        {hint ? <Text className="text-xs text-neutral-400">{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function SelectRow({
  label,
  amount,
  selected,
  shape,
  onPress,
}: {
  label: string;
  amount: number;
  selected: boolean;
  shape: 'radio' | 'checkbox';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-lg border px-4 py-3.5 ${
        selected ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
      }`}
    >
      <View
        className={`h-5 w-5 items-center justify-center border ${
          shape === 'radio' ? 'rounded-full' : 'rounded'
        } ${selected ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300'}`}
      >
        {selected ? (
          <Ionicons name="checkmark" size={13} color="#ffffff" />
        ) : null}
      </View>

      <Text className="flex-1 text-base text-neutral-900">{label}</Text>

      <Text className="text-sm text-neutral-500">
        {amount > 0 ? `+${formatPeso(amount)}` : 'Free'}
      </Text>
    </Pressable>
  );
}

function Stepper({
  icon,
  disabled,
  onPress,
}: {
  icon: 'add' | 'remove';
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-12 w-12 items-center justify-center rounded-lg border ${
        disabled ? 'border-neutral-200' : 'border-neutral-300'
      }`}
    >
      <Ionicons name={icon} size={20} color={disabled ? '#d4d4d4' : '#131313'} />
    </Pressable>
  );
}
