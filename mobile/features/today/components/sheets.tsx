import * as ImagePicker from 'expo-image-picker';
import { ImageSquareIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useColors } from '@/lib/colors';

/** Bottom-sheet-style modal shell (thumb-zone actions). */
function SheetShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable className="flex-1 bg-black/50" accessibilityLabel="Dismiss" onPress={onClose} />
      <View className="gap-4 rounded-t-[20px] border-t border-border bg-card px-5 pb-9 pt-3">
        <View className="h-1 w-10 self-center rounded-full bg-border" />
        {children}
      </View>
    </Modal>
  );
}

interface GeofenceConfirmSheetProps {
  siteName: string;
  distanceM: number | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function GeofenceConfirmSheet({
  siteName,
  distanceM,
  busy,
  onCancel,
  onConfirm,
}: GeofenceConfirmSheetProps) {
  const distanceLine =
    distanceM === null
      ? `We can't read your location right now.`
      : distanceM < 1000
        ? `You're ${distanceM} m from ${siteName}.`
        : `You're ${(distanceM / 1000).toFixed(1)} km from ${siteName}.`;

  return (
    <SheetShell onClose={onCancel}>
      <View className="gap-1">
        <Text className="text-lg font-semibold">{distanceLine}</Text>
        <Text className="text-sm text-muted-foreground">
          {distanceM === null
            ? 'Clock in anyway? Your entry will be recorded without a location.'
            : 'Clock in anyway? Your entry will be flagged for review.'}
        </Text>
      </View>
      <View className="gap-2.5">
        <Button size="lg" disabled={busy} onPress={onConfirm}>
          <Text>{busy ? 'Clocking in…' : 'Clock in anyway'}</Text>
        </Button>
        <Button size="lg" variant="outline" disabled={busy} onPress={onCancel}>
          <Text>Cancel</Text>
        </Button>
      </View>
    </SheetShell>
  );
}

interface ReportIssueSheetProps {
  busy: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (note: string, photo: { base64: string; mimeType: string } | null) => void;
}

export function ReportIssueSheet({ busy, errorMessage, onClose, onSubmit }: ReportIssueSheetProps) {
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<{ base64: string; mimeType: string } | null>(null);
  const c = useColors();

  const attachPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.6,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.base64) {
      setPhoto({ base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
    }
  };

  return (
    <SheetShell onClose={onClose}>
      <View className="gap-1">
        <Text className="text-lg font-semibold">Report an issue</Text>
        <Text className="text-sm text-muted-foreground">
          Goes straight to the Torrens ops team.
        </Text>
      </View>

      <Textarea
        placeholder="What's wrong? e.g. Loading dock roller door won't lock."
        value={note}
        onChangeText={setNote}
        numberOfLines={3}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => void attachPhoto()}
        className="flex-row items-center gap-2 self-start rounded-lg border border-border px-3 py-2 active:bg-muted">
        {photo ? (
          <Image
            source={{ uri: `data:${photo.mimeType};base64,${photo.base64}` }}
            className="size-8 rounded"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <ImageSquareIcon size={16} weight="duotone" color={c.primary} />
        )}
        <Text className="text-sm">{photo ? 'Change photo' : 'Attach photo (optional)'}</Text>
      </Pressable>

      {errorMessage && <Text className="text-sm text-danger">{errorMessage}</Text>}

      <View className="gap-2.5">
        <Button
          size="lg"
          disabled={busy || note.trim().length === 0}
          onPress={() => onSubmit(note.trim(), photo)}>
          <Text>{busy ? 'Sending…' : 'Send report'}</Text>
        </Button>
        <Button size="lg" variant="outline" disabled={busy} onPress={onClose}>
          <Text>Cancel</Text>
        </Button>
      </View>
    </SheetShell>
  );
}
