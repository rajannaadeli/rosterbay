import { HardHatIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useColors } from '@/lib/colors';

/** The single branded placeholder every future-phase screen renders. */
export function ScreenPlaceholder({ title }: { title: string }) {
  const c = useColors();
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <View className="rounded-full bg-muted p-5">
        <HardHatIcon size={30} weight="duotone" color={c.mutedForeground} />
      </View>
      <Text className="text-lg font-semibold">{title}</Text>
      <Text className="text-center text-sm text-muted-foreground">
        Coming in this demo. This screen ships in a later phase of the RosterBay build — your
        document Wallet is fully live today.
      </Text>
    </View>
  );
}
