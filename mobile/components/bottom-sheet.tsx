import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

const SCREEN_H = Dimensions.get('window').height;

interface BottomSheetProps {
  onClose: () => void;
  /**
   * Static content, or a render-prop receiving `close` — an animated dismiss a
   * sheet's own buttons (Cancel, etc.) can call so they animate out like the
   * backdrop/drag instead of snapping shut.
   */
  children: ReactNode | ((close: () => void) => ReactNode);
}

/**
 * Bottom sheet as an inline absolute-fill overlay (never RN <Modal> / Portal —
 * those break navigation context under expo-router). Must be the LAST child of
 * a full-screen navigator screen. Slides up on open, and every dismissal
 * (backdrop, hardware back, drag-down) animates out *before* unmounting so it
 * never snaps shut. The panel is draggable: pull it down past a threshold to
 * dismiss, or release early to spring back.
 */
export function BottomSheet({ onClose, children }: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useRef(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(translateY, {
      toValue: SCREEN_H,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onCloseRef.current());
  }).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => sub.remove();
  }, [translateY, requestClose]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.8) {
          requestClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 2,
            speed: 18,
          }).start();
        }
      },
    })
  ).current;

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, SCREEN_H],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={StyleSheet.absoluteFill} className="justify-end">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={requestClose}
          className="flex-1 bg-black/50"
        />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY }] }} {...pan.panHandlers}>
        {typeof children === 'function' ? children(requestClose) : children}
      </Animated.View>
    </View>
  );
}
