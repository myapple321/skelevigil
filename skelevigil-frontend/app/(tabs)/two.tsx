import { StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { db, storage } from '@/src/firebase';

export default function ScoresScreen() {
  const servicesReady = Boolean(db.app) && Boolean(storage.app);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scores</Text>
      <Text style={styles.subtitle}>Firebase services: {servicesReady ? 'ready' : 'pending'}</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/two.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.8,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
