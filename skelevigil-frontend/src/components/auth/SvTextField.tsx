import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SV } from '@/src/theme/skelevigil';

type Props = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
};

export function SvTextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  keyboardType = "default",
}: Props) {
  const isPasswordField = Boolean(secureTextEntry);
  const [isHidden, setIsHidden] = useState(isPasswordField);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={'rgba(240,240,240,0.6)'}
          secureTextEntry={isPasswordField ? isHidden : undefined}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          style={[styles.input, isPasswordField && styles.inputWithToggle]}
        />
        {isPasswordField ? (
          <Pressable onPress={() => setIsHidden((prev) => !prev)} hitSlop={8}>
            <Text style={styles.toggle}>{isHidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
    width: "100%",
  },
  label: {
    color: SV.neonCyan,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "600",
  },
  field: {
    backgroundColor: SV.gunmetal,
    borderBottomWidth: 1,
    borderBottomColor: SV.neonCyan,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    color: SV.surgicalWhite,
    fontSize: 16,
    flex: 1,
  },
  inputWithToggle: {
    marginRight: 12,
  },
  toggle: {
    color: SV.neonCyan,
    textDecorationLine: 'underline',
    fontSize: 14,
    fontWeight: '600',
  },
});
