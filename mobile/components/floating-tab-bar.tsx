import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import {
  CalendarBlankIcon,
  MegaphoneIcon,
  SunHorizonIcon,
  WalletIcon,
  type Icon,
} from 'phosphor-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** Tab-bar renderer props, derived from expo-router's public Tabs API. */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TAB_META: Record<string, { label: string; icon: Icon }> = {
  index: { label: 'Today', icon: SunHorizonIcon },
  schedule: { label: 'Schedule', icon: CalendarBlankIcon },
  offers: { label: 'Offers', icon: MegaphoneIcon },
  wallet: { label: 'Wallet', icon: WalletIcon },
};

/**
 * WhiteFleet-style floating pill tab bar: in-flow (screens keep their own
 * height, no content hidden underneath), lifted off the screen edge with a
 * card surface and whisper-quiet shadow.
 */
export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom - 6, 8) }}
      className="bg-background px-3 pt-2">
      <View className="flex-row items-stretch rounded-lg border border-border bg-card p-1 shadow-sm">
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const TabIcon = meta.icon;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              onPress={onPress}
              className="flex-1 items-center justify-center gap-0.5 rounded-lg py-1.5">
              {/* 3px teal top-indicator pill on the active tab. */}
              <View
                className={cn(
                  'absolute top-0 h-[3px] w-7 rounded-full',
                  focused ? 'bg-primary' : 'bg-transparent'
                )}
              />
              <TabIcon size={21} weight="duotone" color={focused ? '#0F766E' : '#A8A29E'} />
              <Text
                className={cn(
                  'font-medium text-[11px]',
                  focused ? 'text-primary' : 'text-[#A8A29E]'
                )}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
