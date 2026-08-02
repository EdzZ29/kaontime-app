import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { formatPeso } from '@/api/menu';
import {
  completeOrder,
  listOrders,
  SERVICE_TYPES,
  type Order,
} from '@/api/orders';
import { useAuth } from '@/auth/auth-context';
import { useCart } from '@/order/cart-context';

export default function StartOrderScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isStarted, itemCount, total, startOrder, clear } = useCart();

  const [preparing, setPreparing] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasOrderInProgress = isStarted && itemCount > 0;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    setError(null);

    try {
      // Largest page size available — a kitchen queue should not be paged.
      const result = await listOrders(1, 15, { status: 'preparing' });
      setPreparing(result.items);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not load preparing orders.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Refresh on focus so an order just paid for appears in the queue.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function markDone(order: Order) {
    setCompletingId(order.id);
    // Optimistic: drop it from the queue, restore if the call fails.
    setPreparing((current) => current.filter((o) => o.id !== order.id));

    try {
      await completeOrder(order.id);
    } catch (e) {
      setPreparing((current) => [...current, order].sort((a, b) => b.id - a.id));
      setError(
        e instanceof ApiError ? e.message : 'Could not complete the order.',
      );
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load(true)}
          />
        }
      >
        <View className="items-center pt-2">
          <Image
            source={require('../../../assets/images/KaonTime-logo.png')}
            style={{ width: 110, height: 110 }}
            contentFit="contain"
          />
          <Text className="mt-3 text-center text-lg font-semibold text-neutral-900">
            Hi, {user?.fullName?.split(' ')[0] ?? 'there'}
          </Text>
          <Text className="mt-1 text-center text-sm text-neutral-500">
            {hasOrderInProgress
              ? 'You have an order in progress.'
              : 'Ready to take an order?'}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            if (!hasOrderInProgress) {
              startOrder();
            }
            router.push('/menu');
          }}
          className="mt-6 h-14 flex-row items-center justify-center rounded-lg bg-neutral-900 px-6"
        >
          <Text className="text-base font-semibold text-white">
            {hasOrderInProgress ? 'Continue order' : 'Start Order'}
          </Text>
        </Pressable>

        {hasOrderInProgress ? (
          <View className="mt-3 items-center">
            <Text className="text-sm text-neutral-500">
              {itemCount} item{itemCount === 1 ? '' : 's'} · {formatPeso(total)}
            </Text>
            <Pressable onPress={clear} className="mt-1 px-4 py-2">
              <Text className="text-sm font-medium text-red-600">
                Discard order
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Kitchen queue */}
        <View className="mt-8 flex-row items-baseline justify-between">
          <Text className="text-base font-semibold text-neutral-900">
            Preparing
          </Text>
          <Text className="text-sm text-neutral-500">
            {preparing.length} order{preparing.length === 1 ? '' : 's'}
          </Text>
        </View>

        {error ? (
          <View className="mt-2 rounded-lg bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#131313" />
          </View>
        ) : preparing.length === 0 ? (
          <View className="mt-3 items-center rounded-lg border border-dashed border-neutral-200 py-10">
            <Ionicons name="checkmark-done-outline" size={32} color="#d4d4d4" />
            <Text className="mt-2 text-sm text-neutral-500">
              Nothing preparing right now
            </Text>
          </View>
        ) : (
          <View className="mt-3 gap-3">
            {preparing.map((order) => (
              <PreparingCard
                key={order.id}
                order={order}
                busy={completingId === order.id}
                onDone={() => markDone(order)}
                onOpen={() =>
                  router.push({
                    pathname: '/receipt/[id]',
                    params: { id: String(order.id) },
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PreparingCard({
  order,
  busy,
  onDone,
  onOpen,
}: {
  order: Order;
  busy: boolean;
  onDone: () => void;
  onOpen: () => void;
}) {
  const service =
    SERVICE_TYPES.find((s) => s.value === order.serviceType)?.label ??
    order.serviceType;
  const placed = new Date(order.createdAt);
  const itemCount = order.lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <View className="rounded-xl border border-neutral-200 p-4">
      <Pressable onPress={onOpen} className="flex-row items-start gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-bold text-neutral-900">
              {order.orderNumber}
            </Text>
            <View className="rounded-md bg-amber-100 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-amber-700">
                Preparing
              </Text>
            </View>
          </View>

          <Text className="mt-0.5 text-sm text-neutral-700">
            {order.customerName ?? 'Walk-in customer'}
          </Text>
          <Text className="text-[11px] text-neutral-400">
            {service} ·{' '}
            {placed.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · {itemCount} item{itemCount === 1 ? '' : 's'}
          </Text>
        </View>

        <Text className="text-base font-semibold text-neutral-900">
          {formatPeso(order.total)}
        </Text>
      </Pressable>

      {/* What the kitchen actually needs to make. */}
      <View className="mt-2 gap-0.5">
        {order.lines.map((line) => (
          <Text key={line.id} className="text-xs text-neutral-600">
            {line.quantity}× {line.itemName}
            {line.variantCode ? ` ${line.variantCode}` : ''}
            {line.sizeName ? ` (${line.sizeName})` : ''}
            {line.flavorName ? ` · ${line.flavorName}` : ''}
            {line.addOns.length > 0
              ? ` · ${line.addOns.map((a) => a.name).join(', ')}`
              : ''}
            {line.note ? `  “${line.note}”` : ''}
          </Text>
        ))}
      </View>

      <Pressable
        onPress={onDone}
        disabled={busy}
        className={`mt-3 h-11 flex-row items-center justify-center gap-1.5 rounded-lg ${
          busy ? 'bg-neutral-300' : 'bg-neutral-900'
        }`}
      >
        {busy ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="checkmark" size={17} color="#ffffff" />
            <Text className="text-base font-semibold text-white">Done</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
