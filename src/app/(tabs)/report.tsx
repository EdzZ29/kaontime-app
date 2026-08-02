import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { formatPeso } from '@/api/menu';
import {
  getOrderSummary,
  listOrders,
  PAYMENT_METHODS,
  type Order,
  type OrderSummary,
  type PageSize,
} from '@/api/orders';
import { RevenueBars } from '@/components/bar-chart';
import { Pagination } from '@/components/pagination';

type RangeKey = 'today' | '7d' | '30d' | 'all';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All' },
];

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Resolves a preset into the inclusive from/to the API expects. */
function resolveRange(key: RangeKey): { from?: string; to?: string } {
  if (key === 'all') return {};

  const today = new Date();
  const to = isoDate(today);

  if (key === 'today') return { from: to, to };

  const back = new Date(today);
  back.setDate(back.getDate() - (key === '7d' ? 6 : 29));
  return { from: isoDate(back), to };
}

export default function ReportLogsScreen() {
  const router = useRouter();

  const [range, setRange] = useState<RangeKey>('7d');
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bounds = useMemo(() => resolveRange(range), [range]);

  const load = useCallback(
    async (
      targetPage: number,
      targetLimit: PageSize,
      rangeKey: RangeKey,
      term: string,
      isRefresh = false,
    ) => {
      if (isRefresh) setIsRefreshing(true);
      setError(null);

      const window = resolveRange(rangeKey);

      try {
        // Summary ignores the search box: the totals describe the period,
        // while the table below is what gets filtered.
        const [summaryResult, pageResult] = await Promise.all([
          getOrderSummary(window),
          listOrders(targetPage, targetLimit, { ...window, search: term.trim() }),
        ]);

        setSummary(summaryResult);
        setOrders(pageResult.items);
        setTotal(pageResult.total);
        setTotalPages(pageResult.totalPages);
        setPage(pageResult.page);
      } catch (e) {
        setError(
          e instanceof ApiError ? e.message : 'Could not load the report.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      load(page, limit, range, search);
      // Intentionally not re-running on every keystroke; search applies on submit.
    }, [load, page, limit, range]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  function applyRange(key: RangeKey) {
    setRange(key);
    setPage(1);
    setIsLoading(true);
    load(1, limit, key, search);
  }

  function applySearch() {
    setPage(1);
    setIsLoading(true);
    load(1, limit, range, search);
  }

  function changeLimit(next: PageSize) {
    setLimit(next);
    setPage(1);
    setIsLoading(true);
    load(1, next, range, search);
  }

  function changePage(next: number) {
    setPage(next);
    setIsLoading(true);
    load(next, limit, range, search);
  }

  const margin =
    summary && summary.revenue > 0
      ? Math.round((summary.gross / summary.revenue) * 1000) / 10
      : 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      edges={['top']}
    >
      <View className="px-5 pb-2 pt-1">
        <Text className="text-xl font-bold text-neutral-900">Report Logs</Text>
        <Text className="text-sm text-neutral-500">
          {bounds.from ? `${bounds.from} to ${bounds.to}` : 'All time'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load(page, limit, range, search, true)}
          />
        }
      >
        {/* Date range */}
        <View className="flex-row gap-2 px-5 pb-3">
          {RANGES.map((option) => {
            const active = range === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => applyRange(option.key)}
                className={`flex-1 items-center rounded-lg border py-2 ${
                  active
                    ? 'border-neutral-900 bg-neutral-900'
                    : 'border-neutral-300'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-white' : 'text-neutral-600'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View className="mx-5 mb-3 rounded-lg bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        {/* Totals */}
        <View className="flex-row flex-wrap gap-2 px-5">
          <Stat label="Revenue" value={formatPeso(summary?.revenue ?? 0)} wide />
          <Stat label="Cost" value={formatPeso(summary?.cost ?? 0)} />
          <Stat
            label="Gross"
            value={formatPeso(summary?.gross ?? 0)}
            hint={summary && summary.revenue > 0 ? `${margin}% margin` : undefined}
          />
          <Stat label="Orders" value={String(summary?.orderCount ?? 0)} />
          <Stat label="Items sold" value={String(summary?.itemCount ?? 0)} />
          <Stat
            label="Avg order"
            value={formatPeso(summary?.averageOrder ?? 0)}
          />
        </View>

        {/* Chart */}
        <View className="px-5 pt-4">
          <Text className="mb-2 text-base font-semibold text-neutral-900">
            Daily sales
          </Text>
          <RevenueBars data={summary?.byDay ?? []} />
        </View>

        {/* Search */}
        <View className="px-5 pt-5">
          <View className="flex-row items-center rounded-lg border border-neutral-300 px-3">
            <Ionicons name="search" size={18} color="#a3a3a3" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={applySearch}
              placeholder="Order no., customer, or item"
              placeholderTextColor="#a3a3a3"
              returnKeyType="search"
              className="flex-1 px-3 py-3 text-base text-neutral-900"
            />
            {search.length > 0 ? (
              <Pressable
                onPress={() => {
                  setSearch('');
                  setPage(1);
                  setIsLoading(true);
                  load(1, limit, range, '');
                }}
                hitSlop={8}
                className="p-1"
              >
                <Ionicons name="close-circle" size={18} color="#a3a3a3" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Table */}
        <View className="mt-4 flex-row border-y border-neutral-200 bg-neutral-50 px-5 py-2">
          <Text className="w-20 text-xs font-semibold uppercase text-neutral-500">
            Order
          </Text>
          <Text className="flex-1 text-xs font-semibold uppercase text-neutral-500">
            Customer
          </Text>
          <Text className="w-12 text-center text-xs font-semibold uppercase text-neutral-500">
            Qty
          </Text>
          <Text className="w-20 text-right text-xs font-semibold uppercase text-neutral-500">
            Total
          </Text>
        </View>

        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#131313" />
          </View>
        ) : orders.length === 0 ? (
          <View className="items-center px-8 py-12">
            <Ionicons name="receipt-outline" size={36} color="#d4d4d4" />
            <Text className="mt-3 text-base font-medium text-neutral-700">
              {search.trim() ? 'No matching orders' : 'No orders in this period'}
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onPress={() =>
                router.push({
                  pathname: '/receipt/[id]',
                  params: { id: String(order.id) },
                })
              }
            />
          ))
        )}
      </ScrollView>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={changePage}
        onLimitChange={changeLimit}
      />
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  hint,
  wide,
}: {
  label: string;
  value: string;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <View
      style={{ width: wide ? '100%' : '31.5%' }}
      className="rounded-lg border border-neutral-200 p-3"
    >
      <Text className="text-[10px] font-semibold uppercase text-neutral-400">
        {label}
      </Text>
      <Text
        numberOfLines={1}
        className={`mt-0.5 font-bold text-neutral-900 ${
          wide ? 'text-2xl' : 'text-base'
        }`}
      >
        {value}
      </Text>
      {hint ? (
        <Text className="text-[10px] text-neutral-500">{hint}</Text>
      ) : null}
    </View>
  );
}

function OrderRow({ order, onPress }: { order: Order; onPress: () => void }) {
  const quantity = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const method =
    PAYMENT_METHODS.find((m) => m.value === order.paymentMethod)?.label ??
    order.paymentMethod;
  const when = new Date(order.createdAt);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-neutral-100 px-5 py-3"
    >
      <View className="w-20">
        <Text className="text-sm font-semibold text-neutral-900">
          {order.orderNumber}
        </Text>
        <Text className="text-[10px] text-neutral-400">
          {when.toLocaleDateString()}{' '}
          {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <View className="flex-1 pr-2">
        <Text numberOfLines={1} className="text-sm text-neutral-900">
          {order.customerName ?? '—'}
        </Text>
        <Text numberOfLines={1} className="text-[10px] text-neutral-400">
          {method} · {order.lines.map((l) => l.itemName).join(', ')}
        </Text>
      </View>

      <Text className="w-12 text-center text-sm text-neutral-700">
        {quantity}
      </Text>

      <Text className="w-20 text-right text-sm font-semibold text-neutral-900">
        {formatPeso(order.total)}
      </Text>
    </Pressable>
  );
}
