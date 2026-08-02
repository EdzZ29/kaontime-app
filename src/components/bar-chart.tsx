import { ScrollView, Text, View } from 'react-native';
import { formatPeso } from '@/api/menu';
import type { DailyTotals } from '@/api/orders';

const CHART_HEIGHT = 120;
const BAR_WIDTH = 34;

/**
 * Revenue/gross bars per day. Built from plain views rather than a charting
 * dependency — the shape is simple and this keeps the bundle lean.
 */
export function RevenueBars({ data }: { data: DailyTotals[] }) {
  if (data.length === 0) {
    return (
      <View
        className="items-center justify-center rounded-lg bg-neutral-50"
        style={{ height: CHART_HEIGHT + 40 }}
      >
        <Text className="text-sm text-neutral-400">
          No sales in this period
        </Text>
      </View>
    );
  }

  // Scale to the tallest bar; guard against an all-zero period.
  const peak = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <View className="rounded-lg bg-neutral-50 p-3">
      <View className="mb-2 flex-row items-center gap-4">
        <Legend color="#131313" label="Revenue" />
        <Legend color="#a3a3a3" label="Gross" />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}
      >
        {data.map((day) => {
          const revenueHeight = Math.max(
            2,
            (day.revenue / peak) * CHART_HEIGHT,
          );
          const grossHeight = Math.max(
            1,
            (Math.max(day.gross, 0) / peak) * CHART_HEIGHT,
          );

          return (
            <View key={day.date} style={{ width: BAR_WIDTH }}>
              <View
                style={{ height: CHART_HEIGHT }}
                className="flex-row items-end justify-center gap-1"
              >
                <View
                  style={{ height: revenueHeight }}
                  className="w-3 rounded-t bg-neutral-900"
                />
                <View
                  style={{ height: grossHeight }}
                  className="w-3 rounded-t bg-neutral-400"
                />
              </View>

              <Text
                numberOfLines={1}
                className="mt-1 text-center text-[9px] text-neutral-500"
              >
                {formatDay(day.date)}
              </Text>
              <Text
                numberOfLines={1}
                className="text-center text-[9px] font-medium text-neutral-700"
              >
                {compact(day.revenue)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <Text className="mt-2 text-[10px] text-neutral-400">
        Peak day {formatPeso(peak)}
      </Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        style={{ backgroundColor: color }}
        className="h-2.5 w-2.5 rounded-sm"
      />
      <Text className="text-xs text-neutral-500">{label}</Text>
    </View>
  );
}

/** "2026-08-02" -> "Aug 2" without pulling in a date library. */
function formatDay(iso: string): string {
  const [, month, day] = iso.split('-');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[Number(month) - 1] ?? month} ${Number(day)}`;
}

function compact(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}k`;
  }
  return String(Math.round(value));
}
