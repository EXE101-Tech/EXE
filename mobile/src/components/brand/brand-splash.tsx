import { useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';

/** Same asset, size and background as the system splash (`expo-splash-screen` in app.json), so the hand-over is seamless. */
const SPLASH_IMAGE = require('../../../assets/images/splash-icon.png');
const SPLASH_BACKGROUND = '#080b14';
const SPLASH_IMAGE_SIZE = 150;
/** The logo's lower edge sits about 60dp under the image centre; the name starts just below it. */
const NAME_OFFSET = 78;

const NAME = 'SportGo';
/** Gradient taken from the logo (blue to green), brightened so it reads on the dark background. */
const STOPS = [0, 0.35, 0.7, 1];
const COLORS = ['#4f8bff', '#2fc4c9', '#6fe39a', '#c9f06a'];
/** Share of the gradient visible at once; the rest is what the shimmer scrolls through. */
const WINDOW = 0.6;
const STATIC_COLOR = '#6fe39a';

/** How long the full splash stays before it fades out, and how long that fade takes. */
const HOLD_MS = 1000;
const FADE_MS = 350;

function GlowChar({ char, x, clock }: { char: string; x: number; clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(clock.value * (1 - WINDOW) + x * WINDOW, STOPS, COLORS),
  }));
  return <Animated.Text style={[styles.glow, style]}>{char}</Animated.Text>;
}

/**
 * Branded start screen shown right after the system splash: the logo exactly where the system splash puts it, and
 * the "SportGo" name under it, visible from the first frame, in the logo's colours with a soft glow and a shimmer
 * running through it. It covers the app while that loads and fades out by itself, then calls `onFinish`.
 */
export function BrandSplash({ onFinish }: { onFinish: () => void }) {
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(0);
  const fade = useSharedValue(1);
  const chars = useMemo(() => Array.from(NAME), []);

  useEffect(() => {
    // The name is there from the first frame, together with the logo; only the shimmer in its colours moves.
    if (!reduceMotion) {
      clock.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);
    }
    const fadeTimer = setTimeout(() => {
      fade.value = withTiming(0, { duration: FADE_MS });
    }, HOLD_MS);
    const doneTimer = setTimeout(onFinish, HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [reduceMotion, clock, fade, onFinish]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const last = Math.max(chars.length - 1, 1);
  return (
    <Animated.View style={[styles.root, rootStyle]} accessibilityLabel="SportGo" accessibilityRole="image">
      <View style={styles.center}>
        <Image source={SPLASH_IMAGE} style={{ width: SPLASH_IMAGE_SIZE, height: SPLASH_IMAGE_SIZE }} resizeMode="contain" />
      </View>
      <View style={styles.nameBox}>
        <Text className="text-4xl font-black tracking-widest" style={reduceMotion ? styles.staticName : undefined}>
          {reduceMotion
            ? NAME
            : chars.map((char, index) => <GlowChar key={index} char={char} x={index / last} clock={clock} />)}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BACKGROUND,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Starts under the logo: half the screen down (the logo centre) plus the logo's half height and a small gap.
  nameBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: NAME_OFFSET,
    alignItems: 'center',
  },
  glow: {
    textShadowColor: 'rgba(86, 224, 190, 0.65)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  staticName: {
    color: STATIC_COLOR,
    textShadowColor: 'rgba(86, 224, 190, 0.65)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
});
