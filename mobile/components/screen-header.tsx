import { router } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useColors } from '@/lib/colors';

interface ScreenHeaderProps {
  title?: string;
  /** Optional right-side control (a circular button matches the back button). */
  right?: ReactNode;
}

/**
 * Floating on-canvas header for pushed screens (reference:
 * single_screen_single_action_example) — a circular back button and title
 * sitting on the background, not a stock nav bar. Borderless soft-depth.
 */
export function ScreenHeader({ title, right }: ScreenHeaderProps) {
  const c = useColors();
  return (
    <SafeAreaView edges={['top']} className="bg-background">
      <View className="h-14 flex-row items-center gap-3 px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={() => router.back()}
          className="size-10 items-center justify-center rounded-full bg-card shadow-sm active:opacity-80">
          <CaretLeftIcon size={20} weight="bold" color={c.foreground} />
        </Pressable>
        {title ? (
          <Text className="flex-1 text-lg font-bold tracking-tight" numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View className="flex-1" />
        )}
        {right}
      </View>
    </SafeAreaView>
  );
}
