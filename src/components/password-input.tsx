import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

type Props = Omit<TextInputProps, 'secureTextEntry' | 'className'>;

/**
 * Password field with a show/hide eye toggle. The icon sits inside the border,
 * and the input reserves padding on the right so text never runs under it.
 */
export function PasswordInput(props: Props) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View className="flex-row items-center rounded-lg border border-neutral-300 bg-white pr-2">
      <TextInput
        {...props}
        secureTextEntry={!isVisible}
        autoCapitalize="none"
        placeholderTextColor={props.placeholderTextColor ?? '#a3a3a3'}
        className="flex-1 px-4 py-3.5 text-base text-neutral-900"
      />

      <Pressable
        onPress={() => setIsVisible((current) => !current)}
        hitSlop={8}
        className="p-2"
        accessibilityRole="button"
        accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
      >
        <Ionicons
          name={isVisible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color="#737373"
        />
      </Pressable>
    </View>
  );
}
