import { useNavigation } from 'expo-router';
import { type ReactNode, useCallback } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';

/**
 * Left-to-right order of the merchant bottom tabs. Mirrors the routes declared
 * in `app/(merchant)/(tabs)/_layout.tsx`. The center Sell FAB is a pushed
 * action screen, not a tab, so it is intentionally absent from this chain.
 */
const TAB_ORDER = ['index', 'products', 'orders', 'more'] as const;
export type MerchantTab = (typeof TAB_ORDER)[number];

// A swipe must travel this far, or fling this fast, before it switches tabs.
const SWIPE_DISTANCE = 64;
const SWIPE_VELOCITY = 480;

interface SwipeTabsProps {
  /** Name of the tab this screen represents (its route name). */
  name: MerchantTab;
  children: ReactNode;
}

/**
 * Wraps a tab screen so a horizontal finger swipe moves to the adjacent tab:
 * swipe left → next tab, swipe right → previous tab. Vertical scrolling and
 * row-level swipe gestures keep working — the pan only activates on a clear
 * horizontal drag and bails out the moment the finger moves vertically.
 */
export function SwipeTabs({ name, children }: SwipeTabsProps) {
  const navigation = useNavigation();

  const goTo = useCallback(
    (direction: -1 | 1) => {
      const current = TAB_ORDER.indexOf(name);
      const next = TAB_ORDER[current + direction];
      if (!next) return;
      haptics.tap();
      // Sibling tab route name; expo-router's typed navigate doesn't model it.
      (navigation.navigate as (screen: string) => void)(next);
    },
    [name, navigation],
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-16, 16])
    .onEnd((event) => {
      'worklet';
      const movedLeft = event.translationX <= -SWIPE_DISTANCE || event.velocityX <= -SWIPE_VELOCITY;
      const movedRight = event.translationX >= SWIPE_DISTANCE || event.velocityX >= SWIPE_VELOCITY;
      if (movedLeft) runOnJS(goTo)(1);
      else if (movedRight) runOnJS(goTo)(-1);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1 }} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
}
