import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export interface CashflowDatum {
  label: string;
  moneyIn: number;
  moneyOut: number;
}

export interface CashflowBarsProps {
  data: CashflowDatum[];
  height?: number;
}

/**
 * Paired in/out bars — green money-in beside red money-out per bucket.
 * Pure layout (no SVG): each bar animates in with a spring.
 */
export function CashflowBars({ data, height = 140 }: CashflowBarsProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...data.map((d) => Math.max(d.moneyIn, d.moneyOut)));
  const barAreaHeight = height - 22;

  const showEvery = data.length > 10 ? Math.ceil(data.length / 6) : 1;

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <View className="flex-1 flex-row items-end justify-between">
          {data.map((d, index) => {
            const inH = Math.max(d.moneyIn > 0 ? 3 : 1, (d.moneyIn / max) * barAreaHeight);
            const outH = Math.max(d.moneyOut > 0 ? 3 : 1, (d.moneyOut / max) * barAreaHeight);
            return (
              <View key={`${d.label}-${index}`} className="flex-1 items-center gap-1">
                <View className="w-full flex-row items-end justify-center gap-0.5" style={{ height: barAreaHeight }}>
                  <Animated.View
                    entering={FadeInDown.delay(index * 30).springify().damping(16)}
                    className="w-[30%] max-w-3 rounded-full"
                    style={{ height: inH, backgroundColor: colors.positive }}
                  />
                  <Animated.View
                    entering={FadeInDown.delay(index * 30 + 60).springify().damping(16)}
                    className="w-[30%] max-w-3 rounded-full"
                    style={{ height: outH, backgroundColor: colors.negative, opacity: 0.75 }}
                  />
                </View>
                <Text variant="micro" tone="tertiary" numberOfLines={1}>
                  {index % showEvery === 0 ? d.label : ' '}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
