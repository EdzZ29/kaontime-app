import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { formatPeso } from '@/api/menu';
import { createOrder, PAYMENT_METHODS, type PaymentMethod } from '@/api/orders';
import { StepIndicator } from '@/components/step-indicator';
import { lineTotal, useCart } from '@/order/cart-context';

/** Quick-tender buttons, filtered to those that cover the total. */
const CASH_PRESETS = [20, 50, 100, 200, 500, 1000];

export default function PaymentScreen() {
  const router = useRouter();
  const {
    lines,
    total,
    deliveryFee,
    itemCount,
    customerName,
    orderSource,
    serviceType,
    clear,
  } = useCart();

  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCash = method === 'cash';
  // Non-cash is always exact, so the tendered field only applies to cash.
  const tenderedValue = isCash ? Number(tendered) : total;
  const hasValidTender =
    Number.isFinite(tenderedValue) && tenderedValue >= total;
  const change = hasValidTender
    ? Math.round((tenderedValue - total) * 100) / 100
    : 0;

  const presets = useMemo(
    () => CASH_PRESETS.filter((amount) => amount >= total),
    [total],
  );

  const canPay = lines.length > 0 && hasValidTender && !isPaying;

  async function handlePay() {
    if (!canPay) return;

    setError(null);
    setIsPaying(true);

    try {
      const order = await createOrder({
        lines: lines.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          sizeId: line.size?.id,
          variantId: line.variant?.id,
          flavorId: line.flavor?.id,
          addOnIds: line.addOns.map((a) => a.id),
          note: line.note ?? undefined,
        })),
        customerName: customerName.trim() || undefined,
        orderSource,
        serviceType,
        paymentMethod: method,
        amountTendered: tenderedValue,
      });

      clear();
      router.replace({
        pathname: '/receipt/[id]',
        params: { id: String(order.id) },
      });
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not complete the payment.',
      );
      setIsPaying(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View className="flex-row items-center justify-between border-b border-neutral-100 px-5 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#131313" />
        </Pressable>
        <Text className="text-base font-semibold text-neutral-900">
          Payment
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <StepIndicator current={3} />

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

          {/* Compact summary — editing happens back on the review step. */}
          <View className="rounded-lg bg-neutral-50 p-4">
            {customerName.trim() ? (
              <Text className="mb-2 text-sm font-semibold text-neutral-900">
                For {customerName.trim()}
              </Text>
            ) : null}

            <View className="gap-1">
              {lines.map((line) => (
                <View
                  key={line.key}
                  className="flex-row items-start justify-between gap-3"
                >
                  <Text className="flex-1 text-sm text-neutral-600">
                    {line.quantity}× {line.name}
                    {line.variant ? ` ${line.variant.code}` : ''}
                    {line.size ? ` (${line.size.name})` : ''}
                  </Text>
                  <Text className="text-sm text-neutral-900">
                    {formatPeso(lineTotal(line))}
                  </Text>
                </View>
              ))}
            </View>

            {deliveryFee > 0 ? (
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-sm text-neutral-600">Delivery fee</Text>
                <Text className="text-sm text-neutral-900">
                  {formatPeso(deliveryFee)}
                </Text>
              </View>
            ) : null}

            <View className="my-3 h-px bg-neutral-200" />

            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-neutral-900">
                Total · {itemCount} item{itemCount === 1 ? '' : 's'}
              </Text>
              <Text className="text-lg font-bold text-neutral-900">
                {formatPeso(total)}
              </Text>
            </View>
          </View>

          <Text className="mb-2 mt-6 text-base font-semibold text-neutral-900">
            Payment method
          </Text>
          <View className="flex-row gap-2">
            {PAYMENT_METHODS.map((option) => {
              const active = method === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMethod(option.value)}
                  className={`flex-1 items-center rounded-lg border px-4 py-3.5 ${
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
                </Pressable>
              );
            })}
          </View>

          {isCash ? (
            <>
              <Text className="mb-2 mt-6 text-base font-semibold text-neutral-900">
                Cash received
              </Text>

              <TextInput
                value={tendered}
                onChangeText={setTendered}
                placeholder="0.00"
                placeholderTextColor="#a3a3a3"
                keyboardType="decimal-pad"
                inputMode="decimal"
                className="rounded-lg border border-neutral-300 px-4 py-3.5 text-lg text-neutral-900"
              />

              <View className="mt-3 flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => setTendered(String(total))}
                  className="rounded-lg border border-neutral-300 px-4 py-2.5"
                >
                  <Text className="text-sm font-medium text-neutral-700">
                    Exact
                  </Text>
                </Pressable>
                {presets.map((amount) => (
                  <Pressable
                    key={amount}
                    onPress={() => setTendered(String(amount))}
                    className="rounded-lg border border-neutral-300 px-4 py-2.5"
                  >
                    <Text className="text-sm font-medium text-neutral-700">
                      {formatPeso(amount)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View className="mt-4 rounded-lg bg-neutral-50 p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-neutral-900">
                    Change
                  </Text>
                  <Text className="text-lg font-bold text-neutral-900">
                    {hasValidTender ? formatPeso(change) : '—'}
                  </Text>
                </View>
              </View>

              {tendered.length > 0 && !hasValidTender ? (
                <Text className="mt-2 text-sm text-red-600">
                  Cash received must be at least {formatPeso(total)}.
                </Text>
              ) : null}
            </>
          ) : (
            <Text className="mt-3 text-sm text-neutral-500">
              {formatPeso(total)} will be charged exactly.
            </Text>
          )}
        </ScrollView>

        <View className="border-t border-neutral-100 px-5 pb-2 pt-3">
          <Pressable
            onPress={handlePay}
            disabled={!canPay}
            className={`h-14 flex-row items-center justify-center rounded-lg px-5 ${
              canPay ? 'bg-neutral-900' : 'bg-neutral-300'
            }`}
          >
            {isPaying ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Charge {formatPeso(total)}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
