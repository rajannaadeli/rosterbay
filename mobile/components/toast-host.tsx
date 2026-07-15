import { CheckCircleIcon, InfoIcon, WarningCircleIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useColors } from '@/lib/colors';
import { subscribeToast, type ToastItem } from '@/lib/toast';

const ICON = {
  error: WarningCircleIcon,
  success: CheckCircleIcon,
  info: InfoIcon,
} as const;

/** Single top-anchored toast host — mount once at the app root. */
export function ToastHost() {
  const [item, setItem] = useState<ToastItem | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const c = useColors();

  useEffect(() => {
    return subscribeToast((next) => {
      setItem(next);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 4, speed: 16 }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
          ({ finished }) => finished && setItem(null)
        );
      }, 3200);
    });
  }, [anim]);

  if (!item) return null;
  const tint = { error: c.danger, success: c.success, info: c.primary }[item.tone];
  const Icon = ICON[item.tone];

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        top: insets.top + 8,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      }}
      className="absolute inset-x-4 z-50">
      <View className="flex-row items-center gap-2.5 rounded-[14px] bg-card px-4 py-3 shadow-lg">
        <Icon size={20} weight="fill" color={tint} />
        <Text className="flex-1 text-sm font-medium" numberOfLines={2}>
          {item.message}
        </Text>
      </View>
    </Animated.View>
  );
}
