import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

const LOGIN_HELP_TEAL = '#0E9595';

function LoginHelpHeaderBack() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={styles.headerBackPressable}
      accessibilityRole="button"
      accessibilityLabel="Back">
      <Ionicons name="chevron-back" size={28} color={LOGIN_HELP_TEAL} />
      <Text style={styles.headerBackText}>Back</Text>
    </Pressable>
  );
}

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0D0D0D' },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen
        name="login-help"
        options={{
          headerShown: true,
          title: 'Help',
          headerLeft: () => <LoginHelpHeaderBack />,
          headerStyle: { backgroundColor: '#0D0D0D' },
          headerTitleStyle: { color: LOGIN_HELP_TEAL, fontWeight: '600', fontSize: 17 },
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerBackPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerBackText: {
    color: LOGIN_HELP_TEAL,
    fontSize: 17,
    fontWeight: '400',
    marginLeft: -4,
  },
});
