import { router } from 'expo-router';
import { LightningIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useSignIn } from '@/features/auth/hooks';
import { DEMO_PASSWORD, DEMO_WORKER_EMAIL } from '@/lib/demo';

const credentialsSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter the demo password'),
});

export default function SignInScreen() {
  const signIn = useSignIn();
  const [email, setEmail] = useState(DEMO_WORKER_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [validationError, setValidationError] = useState<string | null>(null);
  const autoSubmitted = useRef(false);

  const submit = (credentials: { email: string; password: string }) => {
    const parsed = credentialsSchema.safeParse(credentials);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Check your details');
      return;
    }
    setValidationError(null);
    signIn.mutate(parsed.data, { onSuccess: () => router.replace('/(tabs)') });
  };

  // Phone-frame web embed: ?demo=1 auto-signs-in as Liam (spec §3 entry flow).
  useEffect(() => {
    if (autoSubmitted.current || Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      autoSubmitted.current = true;
      signIn.mutate(
        { email: DEMO_WORKER_EMAIL, password: DEMO_PASSWORD },
        { onSuccess: () => router.replace('/(tabs)') }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <View className="flex-1 justify-center gap-8 px-6">
          <View className="items-center gap-2">
            <Wordmark />
            <Text className="text-center text-sm text-muted-foreground">
              Roster, verify, and track your field workforce.
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-1.5">
              <Label nativeID="email-label">Email</Label>
              <Input
                aria-labelledby="email-label"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View className="gap-1.5">
              <Label nativeID="password-label">Password</Label>
              <Input
                aria-labelledby="password-label"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {(validationError ??
              (signIn.isError ? 'Sign-in failed — has the demo database been seeded?' : null)) && (
              <Text className="text-sm text-danger">
                {validationError ?? 'Sign-in failed — has the demo database been seeded?'}
              </Text>
            )}
          </View>

          {/* Primary actions live in the bottom half — thumb zone. */}
          <View className="gap-3">
            <Button
              size="lg"
              disabled={signIn.isPending}
              onPress={() => submit({ email, password })}>
              <Text>{signIn.isPending ? 'Signing in…' : 'Sign in'}</Text>
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={signIn.isPending}
              onPress={() => {
                setEmail(DEMO_WORKER_EMAIL);
                setPassword(DEMO_PASSWORD);
                submit({ email: DEMO_WORKER_EMAIL, password: DEMO_PASSWORD });
              }}>
              <LightningIcon size={18} weight="duotone" color="#0F766E" />
              <Text>Use demo worker (Liam)</Text>
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
