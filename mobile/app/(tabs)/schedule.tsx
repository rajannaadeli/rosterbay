import { View } from 'react-native';

import { DemoBanner } from '@/components/demo-banner';
import { ScreenPlaceholder } from '@/components/screen-placeholder';

export default function ScheduleScreen() {
  return (
    <View className="flex-1 bg-background">
      <DemoBanner />
      <ScreenPlaceholder title="Schedule" />
    </View>
  );
}
