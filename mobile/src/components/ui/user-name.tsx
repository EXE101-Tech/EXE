import { useEffect, useMemo } from 'react';
import type { TextProps } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * Mirrors the web `.sg-premium-name`: a 4-stop gradient, 260% wide, that slides back and forth every 6s.
 * React Native has no gradient text without a native masking module, so each character is coloured from the
 * gradient at its own position, and the window the web animates (`background-position`) is moved on the UI
 * thread.
 */
const STOPS = [0, 0.35, 0.63, 1];
const COLORS = ['#55d7e6', '#8b8cff', '#e29af0', '#63e8c3'];
/** Share of the gradient visible at once (1 / 2.6) — the rest is what the animation scrolls through. */
const WINDOW = 1 / 2.6;
const STATIC_COLOR = '#8b8cff';

// One clock drives every premium name on screen, so a long list does not start one animation per row.
let clock: SharedValue<number> | null = null;
let started = false;

function getClock() {
  if (!clock) clock = makeMutable(0);
  return clock;
}

function startClock() {
  if (started) return;
  started = true;
  // 3s each way = the web's 6s keyframe loop (0% → 100% → 0%).
  getClock().value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }), -1, true);
}

function useGradientClock() {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!reduceMotion) startClock();
  }, [reduceMotion]);
  return reduceMotion ? null : getClock();
}

function GradientChar({ char, x, clock: shared }: { char: string; x: number; clock: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => ({
    color: interpolateColor(shared.value * (1 - WINDOW) + x * WINDOW, STOPS, COLORS),
  }));
  return <Animated.Text style={animatedStyle}>{char}</Animated.Text>;
}

interface UserNameProps extends Omit<TextProps, 'children'> {
  children: string;
  /** Premium accounts get the animated gradient; everyone else the plain colour. */
  premium?: boolean;
  /** Colour classes for non-premium names. */
  plainColorClassName?: string;
}

/** A user's display name. Pass the same size/weight classes you would pass to `Text`, but no colour class. */
export function UserName({
  children,
  premium = false,
  className,
  style,
  plainColorClassName = 'text-slate-900 dark:text-white',
  ...props
}: UserNameProps) {
  const shared = useGradientClock();
  const chars = useMemo(() => (premium ? Array.from(children.normalize('NFC')) : []), [premium, children]);

  if (!premium) {
    return (
      <Text className={cn(className, plainColorClassName)} style={style} {...props}>
        {children}
      </Text>
    );
  }

  if (!shared) {
    return (
      <Text className={className} style={[style, { color: STATIC_COLOR }]} {...props}>
        {children}
      </Text>
    );
  }

  const last = Math.max(chars.length - 1, 1);
  return (
    <Text className={className} style={style} {...props}>
      {chars.map((char, index) => (
        <GradientChar key={index} char={char} x={index / last} clock={shared} />
      ))}
    </Text>
  );
}
