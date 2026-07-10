import { Stack } from 'expo-router';
import { View } from 'react-native';

import { ScreenPlaceholder } from '@/components/screen-placeholder';

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: true, title: 'Notifications' }} />
      <ScreenPlaceholder title="Notifications" />
    </View>
  );
}
