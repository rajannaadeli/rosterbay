import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { Wordmark } from '@/components/wordmark';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/hooks';

export default function Index() {
  const session = useSession();

  if (session.isPending) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background">
        <Wordmark />
        <Skeleton className="h-2 w-32 rounded" />
      </View>
    );
  }

  return <Redirect href={session.data ? '/(tabs)' : '/sign-in'} />;
}
