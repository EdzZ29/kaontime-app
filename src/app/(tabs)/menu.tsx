import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, resolveImageUrl } from '@/api/client';
import { formatPeso, listMenu, type MenuItem } from '@/api/menu';
import { useAuth } from '@/auth/auth-context';
import { useCart } from '@/order/cart-context';

type ViewMode = 'grid' | 'list';
const ALL = 'All';

export default function MenuScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { itemCount, total } = useCart();
  const isOwner = user?.role === 'owner';

  const [items, setItems] = useState<MenuItem[]>([]);
  const [category, setCategory] = useState<string>(ALL);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setIsRefreshing(true);
    setError(null);

    try {
      setItems(await listMenu());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the menu.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Refetch on focus so edits made in the form show up immediately.
  useFocusEffect(
    useCallback(() => {
      load('initial');
    }, [load]),
  );

  // Filter tabs come from the data, so any category the owner types appears.
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const item of items) {
      const name = item.category || 'Uncategorized';
      if (!seen.includes(name)) seen.push(name);
    }
    return [ALL, ...seen];
  }, [items]);

  const visible = useMemo(
    () =>
      category === ALL
        ? items
        : items.filter((i) => (i.category || 'Uncategorized') === category),
    [items, category],
  );

  // A last row of 1-2 items would stretch to full width with flex-1 cards, so
  // pad it out with invisible spacers to keep the columns aligned.
  const gridData = useMemo<(MenuItem | null)[]>(() => {
    if (viewMode !== 'grid') return visible;

    const remainder = visible.length % 3;
    if (remainder === 0) return visible;

    return [...visible, ...Array<null>(3 - remainder).fill(null)];
  }, [visible, viewMode]);

  // Tapping an item starts an order line. Editing the item itself is a
  // long-press, kept out of the way of the ordering flow.
  const openOrder = (id: number) =>
    router.push({ pathname: '/order-item/[id]', params: { id: String(id) } });

  const openEditor = (id: number | 'new') =>
    router.push({ pathname: '/menu-item/[id]', params: { id: String(id) } });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      edges={['top']}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-2 pt-1">
        <Text className="text-xl font-bold text-neutral-900">Menu</Text>

        {isOwner ? (
          <Pressable
            onPress={() => router.push('/manage-products')}
            className="h-11 flex-row items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-4"
          >
            <Ionicons name="cube-outline" size={18} color="#ffffff" />
            <Text className="text-base font-semibold text-white">
              Manage Products
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 20 }}
        className="max-h-14 grow-0"
      >
        {categories.map((name) => {
          const active = category === name;
          return (
            <Pressable key={name} onPress={() => setCategory(name)}>
              <Text
                className={`py-3 text-base ${
                  active
                    ? 'font-bold text-neutral-900'
                    : 'font-medium text-neutral-500'
                }`}
              >
                {name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Grid / list toggle */}
      <View className="flex-row justify-end px-5 pb-2 pt-1">
        <View className="flex-row rounded-lg bg-neutral-900 p-0.5">
          <ToggleButton
            icon="grid-outline"
            active={viewMode === 'grid'}
            onPress={() => setViewMode('grid')}
          />
          <ToggleButton
            icon="list-outline"
            active={viewMode === 'list'}
            onPress={() => setViewMode('list')}
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#131313" />
        </View>
      ) : (
        <FlatList
          // numColumns cannot change on a mounted list, so remount per mode.
          key={viewMode}
          data={gridData}
          keyExtractor={(item, index) => item?.id.toString() ?? `spacer-${index}`}
          numColumns={viewMode === 'grid' ? 3 : 1}
          columnWrapperStyle={
            viewMode === 'grid' ? { gap: 12, paddingHorizontal: 20 } : undefined
          }
          contentContainerStyle={{
            gap: 12,
            paddingBottom: 32,
            paddingHorizontal: viewMode === 'grid' ? 0 : 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => load('refresh')}
            />
          }
          ListHeaderComponent={
            error ? (
              <View className="mx-5 mb-2 rounded-xl bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            error ? null : (
              <View className="items-center px-8 py-20">
                <Ionicons name="restaurant-outline" size={40} color="#d4d4d4" />
                <Text className="mt-3 text-base font-medium text-neutral-700">
                  {category === ALL
                    ? 'No menu items yet'
                    : `Nothing in ${category}`}
                </Text>
                <Text className="mt-1 text-center text-sm text-neutral-500">
                  {isOwner
                    ? 'Tap Manage Products to add a dish.'
                    : 'Ask the owner to add items.'}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            if (!item) {
              return <View className="aspect-square flex-1" />;
            }

            return viewMode === 'grid' ? (
              <GridCard
                item={item}
                canEdit={isOwner}
                onPress={() => openOrder(item.id)}
                onLongPress={() => isOwner && openEditor(item.id)}
              />
            ) : (
              <ListRow
                item={item}
                canEdit={isOwner}
                onPress={() => openOrder(item.id)}
                onLongPress={() => isOwner && openEditor(item.id)}
              />
            );
          }}
        />
      )}

      {itemCount > 0 ? (
        <View className="border-t border-neutral-100 px-5 pb-2 pt-3">
          <Pressable
            onPress={() => router.push('/review')}
            className="h-14 flex-row items-center justify-between rounded-lg bg-neutral-900 px-5"
          >
            <Text className="text-base font-semibold text-white">
              View order · {itemCount} item{itemCount === 1 ? '' : 's'}
            </Text>
            <Text className="text-base font-semibold text-white">
              {formatPeso(total)}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ToggleButton({
  icon,
  active,
  onPress,
}: {
  icon: 'grid-outline' | 'list-outline';
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-md px-3.5 py-2 ${active ? 'bg-white' : ''}`}
    >
      <Ionicons name={icon} size={19} color={active ? '#131313' : '#ffffff'} />
    </Pressable>
  );
}

function GridCard({
  item,
  canEdit,
  onPress,
  onLongPress,
}: {
  item: MenuItem;
  canEdit: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const image = resolveImageUrl(item.imageUrl);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={canEdit ? onLongPress : undefined}
      className="flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white"
    >
      {/* Square image on top, details underneath. */}
      <View className="aspect-square w-full items-center justify-center bg-neutral-100">
        {image ? (
          <Image
            source={{ uri: image }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Ionicons name="fast-food-outline" size={30} color="#d4d4d4" />
        )}
      </View>

      <View className="px-2 pb-2.5 pt-2">
        <Text
          numberOfLines={2}
          className="text-sm font-bold leading-tight text-neutral-900"
        >
          {item.name}
        </Text>
        <Text className="mt-1 text-sm font-semibold text-neutral-700">
          {formatPeso(item.price)}
        </Text>
      </View>
    </Pressable>
  );
}

function ListRow({
  item,
  canEdit,
  onPress,
  onLongPress,
}: {
  item: MenuItem;
  canEdit: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={canEdit ? onLongPress : undefined}
      className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
    >
      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
        {resolveImageUrl(item.imageUrl) ? (
          <Image
            source={{ uri: resolveImageUrl(item.imageUrl)! }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="fast-food-outline" size={22} color="#d4d4d4" />
        )}
      </View>

      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900">
          {item.name}
        </Text>
        <Text numberOfLines={1} className="text-xs text-neutral-500">
          {item.description || item.category}
        </Text>

        <View className="mt-1 flex-row items-center gap-2">
          {item.addOns.length > 0 ? (
            <Text className="text-xs text-neutral-400">
              · {item.addOns.length} add-on{item.addOns.length === 1 ? '' : 's'}
            </Text>
          ) : null}
          {item.flavors.length > 0 ? (
            <Text className="text-xs text-neutral-400">
              · {item.flavors.length} flavor
              {item.flavors.length === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>
      </View>

      <Text className="text-base font-bold text-neutral-900">
        {formatPeso(item.price)}
      </Text>

      <Ionicons name="chevron-forward" size={16} color="#a3a3a3" />
    </Pressable>
  );
}
