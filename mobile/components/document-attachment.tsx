import { ArrowClockwiseIcon, CameraIcon, ImageSquareIcon, XIcon } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useColors } from '@/lib/colors';

export interface AttachedImage {
  base64: string;
  mimeType: string;
  fileName: string;
}

interface DocumentAttachmentProps {
  image: AttachedImage | null;
  uploading: boolean;
  errorMessage: string | null;
  onPickCamera: () => void;
  onPickLibrary: () => void;
  onRemove: () => void;
  onRetry: () => void;
}

/** Indeterminate progress bar (uploads have no byte-level progress events). */
function UploadProgressBar() {
  const translate = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translate, { toValue: 1, duration: 1100, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [translate]);

  return (
    <View className="h-1.5 w-full overflow-hidden rounded-lg bg-primary/15">
      <Animated.View
        className="h-full w-1/3 rounded-lg bg-primary"
        style={{
          transform: [
            {
              translateX: translate.interpolate({
                inputRange: [-1, 1],
                outputRange: [-120, 320],
              }),
            },
          ],
        }}
      />
    </View>
  );
}

/**
 * WhiteFleet-style document upload: pick → preview card with remove, progress
 * state while uploading, retry affordance on failure — never a bare input.
 */
export function DocumentAttachment({
  image,
  uploading,
  errorMessage,
  onPickCamera,
  onPickLibrary,
  onRemove,
  onRetry,
}: DocumentAttachmentProps) {
  const c = useColors();
  if (!image) {
    return (
      <View className="gap-2">
        <View className="items-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-6">
          <Text className="text-sm text-muted-foreground">
            Photograph the document or pick it from your library
          </Text>
          <View className="w-full flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={onPickCamera}>
              <CameraIcon size={18} color={c.primary} />
              <Text>Camera</Text>
            </Button>
            <Button variant="outline" className="flex-1" onPress={onPickLibrary}>
              <ImageSquareIcon size={18} color={c.primary} />
              <Text>Library</Text>
            </Button>
          </View>
        </View>
        {errorMessage && <Text className="text-sm text-danger">{errorMessage}</Text>}
      </View>
    );
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3 rounded-[14px] bg-card p-3 shadow-sm">
        <Image
          source={{ uri: `data:${image.mimeType};base64,${image.base64}` }}
          className="size-14 rounded-lg bg-muted"
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <View className="min-w-0 flex-1 gap-1.5">
          <Text className="text-sm font-medium" numberOfLines={1}>
            {image.fileName}
          </Text>
          {uploading ? (
            <View className="gap-1">
              <UploadProgressBar />
              <Text className="text-xs text-muted-foreground">Uploading…</Text>
            </View>
          ) : errorMessage ? (
            <Text className="text-xs text-danger" numberOfLines={2}>
              {errorMessage}
            </Text>
          ) : (
            <Text className="text-xs text-muted-foreground">Ready to upload</Text>
          )}
        </View>
        {!uploading && errorMessage && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry upload"
            hitSlop={8}
            onPress={onRetry}
            className="size-9 items-center justify-center rounded-lg bg-primary/10">
            <ArrowClockwiseIcon size={18} color={c.primary} />
          </Pressable>
        )}
        {!uploading && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove attachment"
            hitSlop={8}
            onPress={onRemove}
            className="size-9 items-center justify-center rounded-lg active:bg-muted">
            <XIcon size={18} color={c.mutedForeground} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
