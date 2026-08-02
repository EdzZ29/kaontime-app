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
import {
  formatPeso,
  listMenu,
  type MenuItem,
} from '@/api/menu';
import { useAuth } from '@/auth/auth-context';

export default function ManageProductsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    setError(null);

    try {
      setItems(await listMenu());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load products.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term),
    );
  }, [items, search]);

  const stats = useMemo(
    () => ({
      products: items.length,
      categories: new Set(items.map((i) => i.category)).size,
      withOptions: items.filter(
        (i) =>
          i.variants.length > 0 || i.sizes.length > 0 || i.addOns.length > 0,
      ).length,
    }),
    [items],
  );

  if (user && user.role !== 'owner') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="lock-closed-outline" size={36} color="#d4d4d4" />
          <Text className="mt-3 text-center text-base text-neutral-600">
            Only the owner can manage products.
          </Text>
          <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2">
            <Text className="font-semibold text-neutral-900">Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View className="flex-row items-center justify-between border-b border-neutral-100 px-5 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#131313" />
        </Pressable>
        <Text className="text-base font-semibold text-neutral-900">
          Manage Products
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load(true)}
          />
        }
      >
        {/* Inventory at a glance */}
        <View className="flex-row flex-wrap gap-2 px-5 pt-4">
          <Stat label="Products" value={String(stats.products)} />
          <Stat label="Categories" value={String(stats.categories)} />
          <Stat label="With options" value={String(stats.withOptions)} />
        </View>

        {error ? (
          <View className="mx-5 mt-3 rounded-lg bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        <View className="px-5 pt-4">
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/menu-item/[id]',
                params: { id: 'new' },
              })
            }
            className="h-12 flex-row items-center justify-center rounded-lg bg-neutral-900"
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text className="ml-1 text-base font-semibold text-white">
              Add product
            </Text>
          </Pressable>
        </View>

        <View className="px-5 pt-3">
          <View className="flex-row items-center rounded-lg border border-neutral-300 px-3">
            <Ionicons name="search" size={18} color="#a3a3a3" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search products or category"
              placeholderTextColor="#a3a3a3"
              className="flex-1 px-3 py-3 text-base text-neutral-900"
            />
          </View>
        </View>

        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#131313" />
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center px-8 py-16">
            <Ionicons name="cube-outline" size={36} color="#d4d4d4" />
            <Text className="mt-3 text-base font-medium text-neutral-700">
              {items.length === 0 ? 'No products yet' : 'No matches'}
            </Text>
          </View>
        ) : (
          <View className="gap-3 px-5 pt-4">
            {filtered.map((item) => (
              <ProductRow
                key={item.id}
                item={item}
                onEdit={() =>
                  router.push({
                    pathname: '/menu-item/[id]',
                    params: { id: String(item.id) },
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

function ProductRow({
  item,
  onEdit,
}: {
  item: MenuItem;
  onEdit: () => void;
}) {
  const margin =
    item.price > 0
      ? Math.round(((item.price - item.cost) / item.price) * 100)
      : 0;

  return (
    <View className="rounded-xl border border-neutral-200 p-4">
      <Pressable onPress={onEdit} className="flex-row items-start gap-3">
        <View className="flex-1">
          <Text className="text-base font-semibold text-neutral-900">
            {item.name}
          </Text>
          <Text className="text-xs text-neutral-500">{item.category}</Text>
        </View>

        <View className="items-end">
          <Text className="text-base font-bold text-neutral-900">
            {formatPeso(item.price)}
          </Text>
          <Text className="text-[10px] text-neutral-400">
            cost {formatPeso(item.cost)} · {margin}%
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#a3a3a3" />
      </Pressable>

      {/* Option counts, so gaps are obvious without opening the form. */}
      <View className="mt-2 flex-row flex-wrap gap-1.5">
        <Tag
          label={`${item.variants.length} variants`}
          muted={!item.variants.length}
        />
        <Tag label={`${item.sizes.length} sizes`} muted={!item.sizes.length} />
        <Tag
          label={`${item.flavors.length} flavors`}
          muted={!item.flavors.length}
        />
        <Tag
          label={`${item.addOns.length} add-ons`}
          muted={!item.addOns.length}
        />
      </View>

    </View>
  );
}

const Tag = ({ label, muted }: { label: string; muted?: boolean }) => (
  <View className={`rounded-md px-2 py-1 ${muted ? '' : 'bg-neutral-100'}`}>
    <Text
      className={`text-[10px] font-medium ${
        muted ? 'text-neutral-300' : 'text-neutral-600'
      }`}
    >
      {label}
    </Text>
  </View>
);

function Stat({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
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
      <Text numberOfLines={1} className="mt-0.5 text-base font-bold text-neutral-900">
        {value}
      </Text>
    </View>
  );
}
