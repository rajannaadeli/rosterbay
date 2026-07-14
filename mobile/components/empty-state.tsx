import { ArrowDownIcon, type Icon } from 'phosphor-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useColors } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: Icon;
  title: string;
  body: string;
  /** Optional pointer to a pinned primary action (renders a down-arrow cue). */
  hint?: string;
  className?: string;
}

/**
 * The one empty state (guide §3.8 — the empty screen is the onboarding):
 * a generous tinted glyph, a bold headline, teaching copy, and an optional
 * arrow cue pointing at the screen's primary action. Borderless by design.
 */
export function EmptyState({ icon: Glyph, title, body, hint, className }: EmptyStateProps) {
  const c = useColors();
  return (
    <View className={cn('flex-1 items-center justify-center gap-4 px-8 py-16', className)}>
      <View className="size-24 items-center justify-center rounded-full bg-primary/10">
        <Glyph size={40} weight="duotone" color={c.primary} />
      </View>
      <View className="items-center gap-1.5">
        <Text className="text-xl font-bold tracking-tight">{title}</Text>
        <Text className="text-center text-[15px] leading-relaxed text-muted-foreground">{body}</Text>
      </View>
      {hint ? (
        <View className="mt-2 flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-primary">{hint}</Text>
          <ArrowDownIcon size={16} weight="bold" color={c.primary} />
        </View>
      ) : null}
    </View>
  );
}
