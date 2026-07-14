import { CalendarCheckIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useColors } from '@/lib/colors';
import { cn } from '@/lib/utils';

export function Wordmark({ className, iconSize = 24 }: { className?: string; iconSize?: number }) {
  const c = useColors();
  return (
    <View className={cn('flex-row items-center gap-1.5', className)}>
      <CalendarCheckIcon size={iconSize} weight="duotone" color={c.primary} />
      <Text className="text-2xl font-semibold tracking-tight text-foreground">RosterBay</Text>
    </View>
  );
}
