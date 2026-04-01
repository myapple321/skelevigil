import { StyleSheet, Text, TextInput, View } from 'react-native';

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
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={SV.muted}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          style={styles.input}
        />
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
  },
  input: {
    color: SV.surgicalWhite,
    fontSize: 16,
  },
});
