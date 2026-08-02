import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

export const ORDER_STEPS = ['Details', 'Review', 'Payment', 'Receipt'] as const;

/** 1-based index of the active step. */
export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <View className="flex-row items-center px-5 py-3">
      {ORDER_STEPS.map((label, index) => {
        const step = index + 1;
        const isDone = step < current;
        const isActive = step === current;
        const isLast = step === ORDER_STEPS.length;

        return (
          <View key={label} className="flex-1 flex-row items-center">
            <View className="items-center">
              <View
                className={`h-7 w-7 items-center justify-center rounded-lg ${
                  isDone || isActive ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={15} color="#ffffff" />
                ) : (
                  <Text
                    className={`text-xs font-bold ${
                      isActive ? 'text-white' : 'text-neutral-500'
                    }`}
                  >
                    {step}
                  </Text>
                )}
              </View>
              <Text
                className={`mt-1 text-[10px] ${
                  isActive
                    ? 'font-semibold text-neutral-900'
                    : 'text-neutral-400'
                }`}
              >
                {label}
              </Text>
            </View>

            {!isLast ? (
              <View
                className={`mx-1 mb-4 h-0.5 flex-1 ${
                  isDone ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
