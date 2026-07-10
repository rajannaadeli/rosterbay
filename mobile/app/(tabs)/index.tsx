import { View } from 'react-native';

import { ScreenPlaceholder } from '@/components/screen-placeholder';

export default function TodayScreen() {
  return (
    <View className="flex-1 bg-background">
      <ScreenPlaceholder title="Today" />
    </View>
  );
}
