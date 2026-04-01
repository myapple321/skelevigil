import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SV } from '@/src/theme/skelevigil';

type Props = {
  onHelpPress?: () => void;
};

export function AuthFooter({ onHelpPress }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onHelpPress} hitSlop={12}>
        <Text style={styles.help}>Help</Text>
      </Pressable>
      <Text style={styles.copy}>© 2026 SkeleVigil. All rights reserved.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 12,
    paddingBottom: 8,
  },
  help: {
    color: SV.neonCyan,
    fontSize: 15,
  },
  copy: {
    color: 'rgba(240,240,240,0.88)',
    fontSize: 11,
    textAlign: "center",
  },
});
