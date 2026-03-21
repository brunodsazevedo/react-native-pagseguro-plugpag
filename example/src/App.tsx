import { useState } from 'react';
import { Text, View, Button, StyleSheet } from 'react-native';
import {
  initializeAndActivatePinPad,
  doAsyncInitializeAndActivatePinPad,
} from 'react-native-pagseguro-plugpag';

export default function App() {
  const [syncResult, setSyncResult] = useState<string>('');
  const [asyncResult, setAsyncResult] = useState<string>('');

  async function handleSync() {
    try {
      const result = await initializeAndActivatePinPad('403938');
      setSyncResult(JSON.stringify(result));
    } catch (error: unknown) {
      const e = error as Error & {
        code?: string;
        userInfo?: { message: string };
      };
      setSyncResult(`${e.code}: ${e.userInfo?.message ?? e.message}`);
    }
  }

  async function handleAsync() {
    try {
      const result = await doAsyncInitializeAndActivatePinPad('403938');
      setAsyncResult(JSON.stringify(result));
    } catch (error: unknown) {
      const e = error as Error & {
        code?: string;
        userInfo?: { message: string };
      };
      setAsyncResult(`${e.code}: ${e.userInfo?.message ?? e.message}`);
    }
  }

  return (
    <View style={styles.container}>
      <Button title="initializeAndActivatePinPad" onPress={handleSync} />
      <Text style={styles.result}>{syncResult}</Text>
      <Button
        title="doAsyncInitializeAndActivatePinPad"
        onPress={handleAsync}
      />
      <Text style={styles.result}>{asyncResult}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  result: {
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
