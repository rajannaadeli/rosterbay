import { router } from 'expo-router';
import { MoonIcon, SignOutIcon, SunIcon } from 'phosphor-react-native';
import { Modal, Pressable, View } from 'react-native';

import { UserAvatar } from '@/components/user-avatar';
import { Text } from '@/components/ui/text';
import { useSignOut } from '@/features/auth/hooks';
import { useColors } from '@/lib/colors';
import { useThemeMode } from '@/lib/theme-mode';
import { cn } from '@/lib/utils';

interface AccountSheetProps {
  name: string;
  subtitle?: string;
  onClose: () => void;
}

/**
 * Account bottom sheet from the header avatar (guide §3.6 — a contextual choice
 * without leaving the screen): identity, the Appearance toggle, and sign out.
 */
export function AccountSheet({ name, subtitle, onClose }: AccountSheetProps) {
  const { mode, setMode } = useThemeMode();
  const signOut = useSignOut();
  const c = useColors();

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable className="flex-1 bg-black/50" accessibilityLabel="Dismiss" onPress={onClose} />
      <View className="gap-5 rounded-t-[24px] bg-card px-5 pb-10 pt-3 shadow-lg">
        <View className="h-1 w-10 self-center rounded-full bg-border" />

        <View className="flex-row items-center gap-3">
          <UserAvatar name={name} size="lg" />
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-semibold" numberOfLines={1}>
              {name}
            </Text>
            {subtitle ? (
              <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Appearance
          </Text>
          <View className="flex-row gap-2 rounded-[14px] bg-muted p-1">
            <ModeButton
              label="Light"
              icon={<SunIcon size={16} weight="fill" color={mode === 'light' ? c.primary : c.mutedForeground} />}
              active={mode === 'light'}
              onPress={() => setMode('light')}
            />
            <ModeButton
              label="Dark"
              icon={<MoonIcon size={16} weight="fill" color={mode === 'dark' ? c.primary : c.mutedForeground} />}
              active={mode === 'dark'}
              onPress={() => setMode('dark')}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onClose();
            signOut.mutate(undefined, { onSuccess: () => router.replace('/sign-in') });
          }}
          className="flex-row items-center gap-3 rounded-[14px] bg-muted px-4 py-3.5 active:opacity-80">
          <SignOutIcon size={18} color={c.mutedForeground} />
          <Text className="text-sm font-medium">Sign out of the demo</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function ModeButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cn(
        'h-11 flex-1 flex-row items-center justify-center gap-2 rounded-[11px]',
        active ? 'bg-card shadow-sm' : ''
      )}>
      {icon}
      <Text className={cn('text-sm font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </Text>
    </Pressable>
  );
}
