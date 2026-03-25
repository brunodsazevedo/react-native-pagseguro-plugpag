import { useState } from 'react';
import { Text, View, Button, StyleSheet, ScrollView } from 'react-native';
import {
  doPayment,
  doAsyncPayment,
  usePaymentProgress,
  type PlugPagTransactionResult,
  type PlugPagPaymentProgressEvent,
} from 'react-native-pagseguro-plugpag';

export default function App() {
  const [syncResult, setSyncResult] = useState<string>('');
  const [asyncResult, setAsyncResult] = useState<string>('');
  const [progressMessages, setProgressMessages] = useState<string[]>([]);

  usePaymentProgress((event: PlugPagPaymentProgressEvent) => {
    const msg = event.customMessage
      ? `[${event.eventCode}] ${event.customMessage}`
      : `[${event.eventCode}]`;
    setProgressMessages((prev) => [...prev, msg]);
  });

  function formatResult(result: PlugPagTransactionResult): string {
    return JSON.stringify(result, null, 2);
  }

  function formatError(error: unknown): string {
    const e = error as Error & {
      code?: string;
      userInfo?: { message: string };
    };
    return `${e.code ?? 'ERROR'}: ${e.userInfo?.message ?? e.message}`;
  }

  async function handleCreditSync() {
    setProgressMessages([]);
    setSyncResult('Aguardando...');
    try {
      const result = await doPayment({
        type: 'CREDIT',
        amount: 1000,
        installmentType: 'A_VISTA',
        installments: 1,
      });
      setSyncResult(formatResult(result));
    } catch (error) {
      setSyncResult(formatError(error));
    }
  }

  async function handleDebitSync() {
    setProgressMessages([]);
    setSyncResult('Aguardando...');
    try {
      const result = await doPayment({
        type: 'DEBIT',
        amount: 2000,
        installmentType: 'A_VISTA',
        installments: 1,
      });
      setSyncResult(formatResult(result));
    } catch (error) {
      setSyncResult(formatError(error));
    }
  }

  async function handlePixSync() {
    setProgressMessages([]);
    setSyncResult('Aguardando...');
    try {
      const result = await doPayment({
        type: 'PIX',
        amount: 3000,
        installmentType: 'A_VISTA',
        installments: 1,
      });
      setSyncResult(formatResult(result));
    } catch (error) {
      setSyncResult(formatError(error));
    }
  }

  async function handleCreditAsync() {
    setProgressMessages([]);
    setAsyncResult('Aguardando...');
    try {
      const result = await doAsyncPayment({
        type: 'CREDIT',
        amount: 1000,
        installmentType: 'A_VISTA',
        installments: 1,
      });
      setAsyncResult(formatResult(result));
    } catch (error) {
      setAsyncResult(formatError(error));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.section}>doPayment (síncrono)</Text>
      <View style={styles.row}>
        <Button title="Crédito R$10" onPress={handleCreditSync} />
        <Button title="Débito R$20" onPress={handleDebitSync} />
        <Button title="PIX R$30" onPress={handlePixSync} />
      </View>
      {syncResult !== '' && <Text style={styles.result}>{syncResult}</Text>}

      <Text style={styles.section}>doAsyncPayment (assíncrono)</Text>
      <Button title="Crédito R$10 (Async)" onPress={handleCreditAsync} />
      {asyncResult !== '' && <Text style={styles.result}>{asyncResult}</Text>}

      {progressMessages.length > 0 && (
        <>
          <Text style={styles.section}>Eventos de Progresso</Text>
          {progressMessages.map((msg, i) => (
            <Text key={i} style={styles.progress}>
              {msg}
            </Text>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  section: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  result: {
    fontFamily: 'monospace',
    fontSize: 11,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'stretch',
  },
  progress: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#555',
    alignSelf: 'flex-start',
  },
});
