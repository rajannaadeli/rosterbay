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
import { useColors } from '@/lib/colors';
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
 * Floating pill tab bar (reference: bottom_navigatio.png). In-flow so no
 * content hides beneath it; the active tab is a soft teal pill with a filled
 * icon, inactive tabs recede to a faint tint. Theme-aware.
 */
export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom - 4, 10) }}
      className="bg-background px-4 pt-2">
      <View className="flex-row items-stretch rounded-full bg-card p-1.5 shadow-md">
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
              className={cn(
                'flex-1 items-center justify-center gap-1 rounded-full py-2',
                focused ? 'bg-primary/10' : ''
              )}>
              <TabIcon
                size={22}
                weight={focused ? 'fill' : 'regular'}
                color={focused ? c.primary : c.faint}
              />
              <Text
                className={cn(
                  'text-[11px]',
                  focused ? 'font-semibold text-primary' : 'font-medium'
                )}
                style={focused ? undefined : { color: c.faint }}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
