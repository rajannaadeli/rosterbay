import { XIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { DEMO_BANNER_TEXT } from '@/lib/demo';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <View className="flex-row items-center justify-between gap-2 border-b border-border bg-primary/5 px-4 py-2">
      <Text className="flex-1 text-xs text-ink">{DEMO_BANNER_TEXT}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss demo banner"
        hitSlop={8}
        onPress={() => setDismissed(true)}>
        <XIcon size={14} color="#78716C" />
      </Pressable>
    </View>
  );
}
