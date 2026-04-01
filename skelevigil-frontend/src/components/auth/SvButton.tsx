import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { SV } from '@/src/theme/skelevigil';

type Variant = "primary" | "secondary";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  style?: ViewStyle;
  disabled?: boolean;
  icon?: ReactNode;
};

export function SvButton({
  title,
  onPress,
  variant = "primary",
  style,
  disabled,
  icon,
}: Props) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
        icon ? styles.row : null,
        style,
      ]}>
      {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
      <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textSecondary]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
  },
  iconSlot: {
    marginRight: 10,
  },
  primary: {
    backgroundColor: SV.neonCyan,
  },
  secondary: {
    backgroundColor: SV.black,
    borderWidth: 1,
    borderColor: SV.neonCyan,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  textPrimary: {
    color: SV.black,
  },
  textSecondary: {
    color: SV.surgicalWhite,
  },
});
