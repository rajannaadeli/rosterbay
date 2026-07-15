import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, BackHandler, Easing, Pressable, StyleSheet, View } from 'react-native';

interface BottomSheetProps {
  onClose: () => void;
  children: ReactNode;
}

/**
 * Bottom sheet as an inline absolute-fill overlay — deliberately NOT
 * react-native's <Modal> (severs the navigation/React context on Android under
 * expo-router) nor a Portal (our <PortalHost/> sits outside the navigator, same
 * failure). It must be the LAST child of a full-screen container that lives
 * inside a navigator screen, so it paints above the screen's chrome while
 * keeping app + navigation context. Backdrop tap / hardware back dismiss; the
 * panel rises + fades in.
 */
export function BottomSheet({ onClose, children }: BottomSheetProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [anim, onClose]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [48, 0] });

  return (
    <View style={StyleSheet.absoluteFill} className="justify-end">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onClose}
          className="flex-1 bg-black/50"
        />
      </Animated.View>
      <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>{children}</Animated.View>
    </View>
  );
}
