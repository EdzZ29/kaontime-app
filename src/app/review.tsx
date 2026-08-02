import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPeso } from '@/api/menu';
import { StepIndicator } from '@/components/step-indicator';
import { lineTotal, useCart } from '@/order/cart-context';

export default function ReviewScreen() {
  const router = useRouter();
  const {
    lines,
    total,
    subtotal,
    deliveryFee,
    itemCount,
    customerName,
    setCustomerName,
    setQuantity,
    removeLine,
  } = useCart();

  const isEmpty = lines.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View className="flex-row items-center justify-between border-b border-neutral-100 px-5 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#131313" />
        </Pressable>
        <Text className="text-base font-semibold text-neutral-900">
          Review order
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <StepIndicator current={2} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {isEmpty ? (
            <View className="items-center py-16">
              <Ionicons name="cart-outline" size={40} color="#d4d4d4" />
              <Text className="mt-3 text-base font-medium text-neutral-700">
                Nothing in this order yet
              </Text>
              <Pressable
                onPress={() => router.replace('/menu')}
                className="mt-4 h-12 flex-row items-center justify-center rounded-lg border border-neutral-300 px-6"
              >
                <Text className="text-base font-semibold text-neutral-900">
                  Back to menu
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View className="mb-5">
                <Text className="mb-1.5 text-sm font-medium text-neutral-700">
                  Customer name
                </Text>
                <TextInput
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Optional"
                  placeholderTextColor="#a3a3a3"
                  className="rounded-lg border border-neutral-300 px-4 py-3.5 text-base text-neutral-900"
                />
              </View>

              <Text className="mb-2 text-base font-semibold text-neutral-900">
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </Text>

              <View className="gap-3">
                {lines.map((line) => (
                  <View
                    key={line.key}
                    className="rounded-xl border border-neutral-200 p-4"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-neutral-900">
                          {line.name}
                        </Text>

                        {line.variant ? (
                          <Text className="text-xs font-semibold text-neutral-700">
                            {line.variant.code}
                            {line.variant.name ? ` · ${line.variant.name}` : ''}
                          </Text>
                        ) : null}

                        {line.size ? (
                          <Text className="text-xs text-neutral-500">
                            Size: {line.size.name}
                            {line.size.priceDelta > 0
                              ? ` +${formatPeso(line.size.priceDelta)}`
                              : ''}
                          </Text>
                        ) : null}

                        {line.flavor ? (
                          <Text className="text-xs text-neutral-500">
                            Flavor: {line.flavor.name}
                            {line.flavor.priceDelta > 0
                              ? ` +${formatPeso(line.flavor.priceDelta)}`
                              : ''}
                          </Text>
                        ) : null}

                        {line.addOns.length > 0 ? (
                          <Text className="text-xs text-neutral-500">
                            {line.addOns
                              .map((a) => `${a.name} +${formatPeso(a.price)}`)
                              .join(', ')}
                          </Text>
                        ) : null}

                        {line.note ? (
                          <Text className="mt-1 text-xs italic text-neutral-500">
                            “{line.note}”
                          </Text>
                        ) : null}
                      </View>

                      <Text className="text-base font-semibold text-neutral-900">
                        {formatPeso(lineTotal(line))}
                      </Text>
                    </View>

                    <View className="mt-3 flex-row items-center gap-3">
                      <QtyButton
                        icon="remove"
                        onPress={() => setQuantity(line.key, line.quantity - 1)}
                      />
                      <Text className="min-w-6 text-center text-base font-semibold text-neutral-900">
                        {line.quantity}
                      </Text>
                      <QtyButton
                        icon="add"
                        onPress={() => setQuantity(line.key, line.quantity + 1)}
                      />

                      <Pressable
                        onPress={() => removeLine(line.key)}
                        className="ml-auto px-2 py-1"
                        hitSlop={6}
                      >
                        <Text className="text-sm font-medium text-red-600">
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => router.push('/menu')}
                className="mt-4 h-12 flex-row items-center justify-center rounded-lg border border-neutral-300"
              >
                <Ionicons name="add" size={18} color="#131313" />
                <Text className="ml-1 text-base font-semibold text-neutral-900">
                  Add more items
                </Text>
              </Pressable>

              <View className="mt-6 gap-1.5 rounded-lg bg-neutral-50 p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-neutral-600">Subtotal</Text>
                  <Text className="text-sm text-neutral-900">
                    {formatPeso(subtotal)}
                  </Text>
                </View>

                {deliveryFee > 0 ? (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-neutral-600">
                      Delivery fee
                    </Text>
                    <Text className="text-sm text-neutral-900">
                      {formatPeso(deliveryFee)}
                    </Text>
                  </View>
                ) : null}

                <View className="my-1 h-px bg-neutral-200" />

                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-neutral-900">
                    Total
                  </Text>
                  <Text className="text-lg font-bold text-neutral-900">
                    {formatPeso(total)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {!isEmpty ? (
          <View className="border-t border-neutral-100 px-5 pb-2 pt-3">
            <Pressable
              onPress={() => router.push('/checkout')}
              className="h-14 flex-row items-center justify-between rounded-lg bg-neutral-900 px-5"
            >
              <Text className="text-base font-semibold text-white">
                Continue to payment
              </Text>
              <Text className="text-base font-semibold text-white">
                {formatPeso(total)}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function QtyButton({
  icon,
  onPress,
}: {
  icon: 'add' | 'remove';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="h-9 w-9 items-center justify-center rounded-lg border border-neutral-300"
    >
      <Ionicons name={icon} size={18} color="#131313" />
    </Pressable>
  );
}
