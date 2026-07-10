import { addMonths, format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import { CameraIcon, CheckCircleIcon, ImageSquareIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useAddCert, useCertTypes, useMyProfile } from '@/features/wallet/hooks';
import { cn } from '@/lib/utils';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const addDocumentSchema = z.object({
  certTypeId: z.string().min(1, 'Choose a certificate type'),
  issuedOn: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD'),
  expiresOn: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD'),
});

interface PickedImage {
  base64: string;
  mimeType: string;
  fileName: string;
}

export default function AddDocumentScreen() {
  const profile = useMyProfile();
  const certTypes = useCertTypes();
  const addCert = useAddCert();

  const [certTypeId, setCertTypeId] = useState('');
  const [issuedOn, setIssuedOn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expiresOn, setExpiresOn] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const chooseCertType = (id: string) => {
    setCertTypeId(id);
    const certType = certTypes.data?.find((t) => t.id === id);
    if (certType?.validity_months && DATE_PATTERN.test(issuedOn) && expiresOn === '') {
      setExpiresOn(format(addMonths(new Date(issuedOn), certType.validity_months), 'yyyy-MM-dd'));
    }
  };

  const handlePicked = (result: ImagePicker.ImagePickerResult) => {
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    setImage({
      base64: asset.base64,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileName: asset.fileName ?? 'photo',
    });
    setFormError(null);
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setFormError('Camera permission is needed to photograph the document.');
      return;
    }
    handlePicked(await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 }));
  };

  const pickFromLibrary = async () => {
    handlePicked(
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.7,
      })
    );
  };

  const submit = () => {
    const parsed = addDocumentSchema.safeParse({ certTypeId, issuedOn, expiresOn });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the form');
      return;
    }
    if (!image) {
      setFormError('Attach a photo of the document');
      return;
    }
    if (!profile.data) return;
    setFormError(null);
    addCert.mutate(
      {
        workerId: profile.data.id,
        companyId: profile.data.company_id,
        certTypeId: parsed.data.certTypeId,
        issuedOn: parsed.data.issuedOn,
        expiresOn: parsed.data.expiresOn,
        imageBase64: image.base64,
        mimeType: image.mimeType,
      },
      { onSuccess: () => router.back() }
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: true, title: 'Add document' }} />
      <ScrollView contentContainerClassName="gap-5 p-4 pb-10">
        <View className="gap-2">
          <Label nativeID="cert-type-label">Certificate type</Label>
          <View className="gap-1.5" aria-labelledby="cert-type-label">
            {certTypes.data?.map((certType) => {
              const selected = certTypeId === certType.id;
              return (
                <Pressable
                  key={certType.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  className={cn(
                    'flex-row items-center justify-between rounded border border-border bg-card px-3 py-2.5',
                    selected && 'border-primary bg-primary/5'
                  )}
                  onPress={() => chooseCertType(certType.id)}>
                  <View>
                    <Text className="text-sm font-medium">{certType.name}</Text>
                    <Text className="text-xs text-muted-foreground">{certType.code}</Text>
                  </View>
                  {selected && <CheckCircleIcon size={18} weight="duotone" color="#0F766E" />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Label nativeID="issued-label">Issued (YYYY-MM-DD)</Label>
            <Input
              aria-labelledby="issued-label"
              value={issuedOn}
              onChangeText={setIssuedOn}
              keyboardType="numbers-and-punctuation"
              placeholder="2026-01-31"
            />
          </View>
          <View className="flex-1 gap-1.5">
            <Label nativeID="expires-label">Expires (YYYY-MM-DD)</Label>
            <Input
              aria-labelledby="expires-label"
              value={expiresOn}
              onChangeText={setExpiresOn}
              keyboardType="numbers-and-punctuation"
              placeholder="2027-01-31"
            />
          </View>
        </View>

        <View className="gap-2">
          <Label>Document photo</Label>
          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={() => void pickFromCamera()}>
              <CameraIcon size={18} color="#0F766E" />
              <Text>Camera</Text>
            </Button>
            <Button variant="outline" className="flex-1" onPress={() => void pickFromLibrary()}>
              <ImageSquareIcon size={18} color="#0F766E" />
              <Text>Library</Text>
            </Button>
          </View>
          {image && (
            <Text className="text-xs text-muted-foreground">Attached: {image.fileName}</Text>
          )}
        </View>

        {(formError ?? (addCert.isError ? addCert.error.message : null)) && (
          <Text className="text-sm text-danger">
            {formError ?? `Upload failed: ${addCert.error?.message ?? ''}`}
          </Text>
        )}

        <Button size="lg" disabled={addCert.isPending || profile.isPending} onPress={submit}>
          <Text>{addCert.isPending ? 'Uploading…' : 'Add to wallet'}</Text>
        </Button>
      </ScrollView>
    </View>
  );
}
