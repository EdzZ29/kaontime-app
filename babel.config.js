/**
 * Required for NativeWind on native: `nativewind/babel` installs the
 * import-plugin that rewrites `react-native` imports to className-aware
 * components. Without it `className` silently does nothing on iOS/Android
 * (web still works, because Tailwind emits real CSS there).
 *
 * The preset also adds `react-native-worklets/plugin`, which Reanimated needs
 * and `babel-preset-expo` does not provide.
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
  };
};
