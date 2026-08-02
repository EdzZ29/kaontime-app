import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { formatPeso } from '@/api/menu';
import {
  getOrder,
  ORDER_SOURCES,
  PAYMENT_METHODS,
  SERVICE_TYPES,
  type Order,
} from '@/api/orders';
import { StepIndicator } from '@/components/step-indicator';

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      setError('Unknown receipt.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    getOrder(numericId)
      .then((loaded) => !cancelled && setOrder(loaded))
      .catch((e) =>
        setError(
          e instanceof ApiError ? e.message : 'Could not load the receipt.',
        ),
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

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base text-neutral-600">
            {error ?? 'Receipt not found.'}
          </Text>
          <Pressable
            onPress={() => router.replace('/start')}
            className="mt-4 px-4 py-2"
          >
            <Text className="font-semibold text-neutral-900">Back to start</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const methodLabel =
    PAYMENT_METHODS.find((m) => m.value === order.paymentMethod)?.label ??
    order.paymentMethod;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StepIndicator current={4} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        <View className="items-center pt-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <Ionicons name="checkmark" size={30} color="#047857" />
          </View>
          <Text className="mt-3 text-xl font-bold text-neutral-900">
            Payment complete
          </Text>
          <Text className="mt-1 text-sm text-neutral-500">
            {formatPeso(order.total)} · {methodLabel}
          </Text>
        </View>

        <View className="mt-6 rounded-xl border border-neutral-200 p-5">
          <View className="items-center border-b border-dashed border-neutral-200 pb-4">
            <Image
              source={require('../../../assets/images/KaonTime-logo.png')}
              style={{ width: 56, height: 56 }}
              contentFit="contain"
            />
            <Text className="mt-2 text-base font-bold text-neutral-900">
              Kaon Time
            </Text>
            <Text className="mt-1 text-base font-bold tracking-wider text-neutral-900">
              {order.orderNumber}
            </Text>
            <Text className="text-xs text-neutral-500">
              {new Date(order.createdAt).toLocaleString()}
            </Text>
            {order.customerName ? (
              <Text className="mt-1 text-sm font-medium text-neutral-700">
                For {order.customerName}
              </Text>
            ) : null}
            <Text className="mt-0.5 text-xs text-neutral-500">
              {ORDER_SOURCES.find((s) => s.value === order.orderSource)?.label}
              {' · '}
              {SERVICE_TYPES.find((s) => s.value === order.serviceType)?.label}
            </Text>
          </View>

          <View className="gap-3 py-4">
            {order.lines.map((line) => (
              <View key={line.id}>
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="flex-1 text-sm text-neutral-900">
                    {line.quantity}× {line.itemName}
                  </Text>
                  <Text className="text-sm font-medium text-neutral-900">
                    {formatPeso(line.lineTotal)}
                  </Text>
                </View>

                {line.variantCode ? (
                  <Text className="text-xs font-semibold text-neutral-600">
                    {line.variantCode}
                    {line.variantName ? ` · ${line.variantName}` : ''}
                  </Text>
                ) : null}

                {line.sizeName ? (
                  <Text className="text-xs text-neutral-500">
                    {line.sizeName}
                    {line.sizePriceDelta > 0
                      ? ` +${formatPeso(line.sizePriceDelta)}`
                      : ''}
                  </Text>
                ) : null}

                {line.flavorName ? (
                  <Text className="text-xs text-neutral-500">
                    {line.flavorName}
                    {line.flavorPriceDelta > 0
                      ? ` +${formatPeso(line.flavorPriceDelta)}`
                      : ''}
                  </Text>
                ) : null}

                {line.addOns.map((addOn) => (
                  <Text key={addOn.id} className="text-xs text-neutral-500">
                    + {addOn.name} {formatPeso(addOn.price)}
                  </Text>
                ))}

                {line.note ? (
                  <Text className="text-xs italic text-neutral-500">
                    “{line.note}”
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          <View className="gap-1.5 border-t border-dashed border-neutral-200 pt-4">
            <ReceiptRow label="Subtotal" value={formatPeso(order.subtotal)} />
            {order.deliveryFee > 0 ? (
              <ReceiptRow
                label="Delivery fee"
                value={formatPeso(order.deliveryFee)}
              />
            ) : null}
            <ReceiptRow label="Total" value={formatPeso(order.total)} emphasis />
            <ReceiptRow
              label={`Paid (${methodLabel})`}
              value={formatPeso(order.amountTendered)}
            />
            <ReceiptRow label="Change" value={formatPeso(order.changeDue)} />
          </View>

          <Text className="mt-4 text-center text-xs text-neutral-400">
            Salamat! Come again.
          </Text>
        </View>
      </ScrollView>

      <View className="border-t border-neutral-100 px-5 pb-2 pt-3">
        {/* Confirming the receipt closes the order and lands on the log. */}
        <Pressable
          onPress={() => router.replace('/report')}
          className="h-14 flex-row items-center justify-center rounded-lg bg-neutral-900"
        >
          <Text className="text-base font-semibold text-white">Done</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/start')}
          className="mt-2 h-12 flex-row items-center justify-center rounded-lg border border-neutral-300"
        >
          <Text className="text-base font-semibold text-neutral-900">
            New order
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ReceiptRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className={
          emphasis
            ? 'text-sm font-semibold text-neutral-900'
            : 'text-sm text-neutral-600'
        }
      >
        {label}
      </Text>
      <Text
        className={
          emphasis
            ? 'text-base font-bold text-neutral-900'
            : 'text-sm text-neutral-900'
        }
      >
        {value}
      </Text>
    </View>
  );
}
