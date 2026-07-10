import { SquaresFourIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function Wordmark({ className, iconSize = 24 }: { className?: string; iconSize?: number }) {
  return (
    <View className={cn('flex-row items-center gap-1.5', className)}>
      <SquaresFourIcon size={iconSize} weight="duotone" color="#0F766E" />
      <Text className="text-2xl font-semibold tracking-tight text-ink">RosterBay</Text>
    </View>
  );
}
