import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { PAGE_SIZES, type PageSize } from '@/api/orders';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: PageSize;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: PageSize) => void;
}

/** Page-size selector plus prev/next, shared by any paginated table. */
export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: Props) {
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <View className="border-t border-neutral-100 px-5 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-neutral-500">
          {first}-{last} of {total}
        </Text>

        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-neutral-500">Per page</Text>
          <View className="flex-row rounded-lg border border-neutral-300">
            {PAGE_SIZES.map((size, index) => {
              const active = limit === size;
              return (
                <Pressable
                  key={size}
                  onPress={() => onLimitChange(size)}
                  className={`px-3 py-1.5 ${active ? 'bg-neutral-900' : ''} ${
                    index === 0 ? 'rounded-l-md' : ''
                  } ${index === PAGE_SIZES.length - 1 ? 'rounded-r-md' : ''}`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-white' : 'text-neutral-600'
                    }`}
                  >
                    {size}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <PageButton
          icon="chevron-back"
          label="Prev"
          disabled={page <= 1}
          onPress={() => onPageChange(page - 1)}
        />

        <Text className="text-sm font-medium text-neutral-700">
          Page {page} of {totalPages}
        </Text>

        <PageButton
          icon="chevron-forward"
          label="Next"
          iconRight
          disabled={page >= totalPages}
          onPress={() => onPageChange(page + 1)}
        />
      </View>
    </View>
  );
}

function PageButton({
  icon,
  label,
  disabled,
  iconRight,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  disabled: boolean;
  iconRight?: boolean;
  onPress: () => void;
}) {
  const color = disabled ? '#d4d4d4' : '#131313';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-9 flex-row items-center gap-1 rounded-lg border px-3 ${
        disabled ? 'border-neutral-200' : 'border-neutral-300'
      }`}
    >
      {!iconRight ? <Ionicons name={icon} size={16} color={color} /> : null}
      <Text
        className={`text-sm font-medium ${
          disabled ? 'text-neutral-300' : 'text-neutral-900'
        }`}
      >
        {label}
      </Text>
      {iconRight ? <Ionicons name={icon} size={16} color={color} /> : null}
    </Pressable>
  );
}
