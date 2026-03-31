import { StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { app, db, storage } from '@/src/firebase';

export default function PlayScreen() {
  const firebaseReady = Boolean(app.name) && Boolean(db.app) && Boolean(storage.app);
  const projectId = app.options.projectId ?? 'unknown-project';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Play</Text>
      <Text style={styles.subtitle}>
        Firebase: {firebaseReady ? `connected (${projectId})` : 'not connected'}
      </Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
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
