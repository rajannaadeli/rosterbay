import { HardHatIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

/** The single branded placeholder every future-phase screen renders. */
export function ScreenPlaceholder({ title }: { title: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <View className="rounded bg-muted p-4">
        <HardHatIcon size={30} weight="duotone" color="#78716C" />
      </View>
      <Text className="text-lg font-semibold">{title}</Text>
      <Text className="text-center text-sm text-muted-foreground">
        Coming in this demo. This screen ships in a later phase of the RosterBay build — your
        document Wallet is fully live today.
      </Text>
    </View>
  );
}
