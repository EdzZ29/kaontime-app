import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useAuth } from '@/auth/auth-context';

/** How long the logo stays on screen before routing onwards. */
const SPLASH_DURATION_MS = 2500;

export default function SplashRoute() {
  const { isPreparing } = useAuth();
  const router = useRouter();

  const mountedAt = useRef(Date.now());
  // Animated (not Reanimated) so the pulse behaves identically on web.
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    entrance.start(({ finished }) => {
      if (finished) {
        pulse.start();
      }
    });

    return () => {
      entrance.stop();
      pulse.stop();
    };
  }, [opacity, scale]);

  // Always hand off to login: a cold start is never signed in. `replace` keeps
  // the splash off the back stack so it cannot be returned to.
  useEffect(() => {
    if (isPreparing) {
      return;
    }

    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(0, SPLASH_DURATION_MS - elapsed);

    const timer = setTimeout(() => {
      router.replace('/login');
    }, remaining);

    return () => clearTimeout(timer);
  }, [isPreparing, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Image
          source={require('../../assets/images/KaonTime-logo.png')}
          style={{ width: 220, height: 220 }}
          contentFit="contain"
        />
      </Animated.View>

      <Animated.Text
        style={{ opacity }}
        className="mt-6 text-sm tracking-[3px] text-neutral-400"
      >
        POINT OF SALE
      </Animated.Text>
    </View>
  );
}
