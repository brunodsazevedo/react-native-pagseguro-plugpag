<div align="center">
  <img src=".github/images/react-native-pagseguro-plugpag-logo.png" alt="react-native-pagseguro-plugpag" width="200" />
</div>

<div align="center">

# react-native-pagseguro-plugpag

</div>


> TurboModule React Native para o SDK PlugPag da PagSeguro — aceite pagamentos em terminais SmartPOS PagBank

<div align="center">

  [![npm version](https://img.shields.io/npm/v/react-native-pagseguro-plugpag.svg)](https://www.npmjs.com/package/react-native-pagseguro-plugpag)
  [![License MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Platform Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://developer.android.com)
  [![React Native 0.76+](https://img.shields.io/badge/React%20Native-0.76%2B-blue.svg)](https://reactnative.dev)

</div>


---

## O que é esta biblioteca?

Os terminais SmartPOS PagBank (A920, A930, P2, S920) rodam Android e expõem um SDK de pagamentos proprietário — mas não possuem uma bridge oficial para React Native. Desenvolvedores que constroem aplicativos nesses terminais precisam escrever sua própria integração nativa ou encontrar uma solução mantida.

`react-native-pagseguro-plugpag` é uma biblioteca React Native que preenche essa lacuna. Ela encapsula o SDK oficial `PlugPagServiceWrapper` da PagSeguro em um TurboModule, expondo uma API TypeScript completamente tipada para ativar o terminal, aceitar pagamentos, processar estornos e imprimir comprovantes — tudo a partir do JavaScript.

O SDK subjacente é o `PlugPagServiceWrapper 1.33.0`, distribuído via Maven em `https://github.com/pagseguro/PlugPagServiceWrapper/raw/master`. Esta biblioteca gerencia a configuração do Maven automaticamente via seu plugin de configuração Expo, portanto você não precisa adicionar a dependência do SDK manualmente.

---

## Pré-requisitos

Antes de instalar esta biblioteca, certifique-se de que seu projeto atende aos seguintes requisitos:

**Hardware**

- Um terminal SmartPOS PagBank (A920, A930, P2 ou S920) é necessário para executar operações de pagamento. Celulares Android comuns e emuladores não são suportados para uso em produção.

**React Native**

- React Native **≥ 0.76** com **New Architecture habilitada** (`newArchEnabled=true` em `android/gradle.properties`). Esta biblioteca usa TurboModules (JSI) e não funcionará com a bridge legada.

**Android SDK**

- SDK mínimo: **24**
- Compile SDK: **36**
- Target SDK: **36**

**Expo**

- Expo SDK **52+** é suportado via o plugin de configuração incluso.
- **Expo Go não é suportado** — a biblioteca contém código nativo e deve ser usada com um development build (`eas build`) ou um production build (`npx expo run:android`).

---

## Instalação

### Instalação — Bare React Native

**Passo 1 — Instalar a biblioteca**

```sh
npm install react-native-pagseguro-plugpag
# or
yarn add react-native-pagseguro-plugpag
```

**Passo 2 — Habilitar a New Architecture**

Em `android/gradle.properties`, verifique se esta linha está presente e definida como `true`:

```properties
newArchEnabled=true
```

**Passo 3 — Adicionar o repositório Maven**

Em `android/build.gradle`, adicione o repositório Maven da PagSeguro dentro do bloco `allprojects > repositories`:

```groovy
allprojects {
    repositories {
        // ... other repositories
        maven { url 'https://github.com/pagseguro/PlugPagServiceWrapper/raw/master' }
    }
}
```

> **Atenção**: **Não** adicione a dependência `PlugPagServiceWrapper` ao seu `build.gradle` manualmente. Esta biblioteca a declara como dependência transitiva — adicioná-la duas vezes causará conflitos de versão.

**Passo 4 — Build**

```sh
npx react-native run-android
```

**Resumo da instalação**

| Passo | Ação | Arquivo |
|-------|------|---------|
| 1 | Instalar o pacote | — |
| 2 | Habilitar New Architecture | `android/gradle.properties` |
| 3 | Adicionar repositório Maven | `android/build.gradle` |
| 4 | Build | — |

---

### Instalação — Expo

Adicione a biblioteca e configure o plugin em `app.json`:

```json
{
  "expo": {
    "plugins": [
      "react-native-pagseguro-plugpag"
    ]
  }
}
```

O plugin de configuração configura automaticamente:

- O repositório Maven da PagSeguro no build Android
- `newArchEnabled=true` em `gradle.properties`
- A dependência do SDK necessária

Build usando EAS ou build local:

```sh
# EAS Build (recomendado)
eas build --platform android

# Build local
npx expo run:android
```

> **Observação**: Expo Go não é suportado. Use um development build ou production build.

**Resumo da instalação**

| Passo | Ação | Arquivo |
|-------|------|---------|
| 1 | Instalar o pacote | — |
| 2 | Adicionar plugin | `app.json` |
| 3 | Build com EAS ou localmente | — |

---

## Uso

### Ativação do PinPad

O terminal deve ser ativado antes de qualquer operação de pagamento. Use seu código de ativação PagBank.

**Ativação síncrona** (recomendada para fluxos simples):

```typescript
import { initializeAndActivatePinPad } from 'react-native-pagseguro-plugpag';

try {
  const result = await initializeAndActivatePinPad('YOUR_ACTIVATION_CODE');
  console.log('Activated:', result.result); // 'ok'
} catch (error) {
  console.error('Activation failed:', error);
}
```

**Ativação assíncrona** (usa listener nativo do SDK — preferida quando I/O bloqueante é uma preocupação):

```typescript
import { doAsyncInitializeAndActivatePinPad } from 'react-native-pagseguro-plugpag';

try {
  const result = await doAsyncInitializeAndActivatePinPad('YOUR_ACTIVATION_CODE');
  console.log('Activated:', result.result); // 'ok'
} catch (error) {
  console.error('Activation failed:', error);
}
```

Use a variante síncrona para fluxos de ativação simples. Use a variante assíncrona quando precisar do mecanismo orientado a eventos do SDK nativo.

---

### Pagamento com Débito

```typescript
import { doPayment, PaymentType, InstallmentType } from 'react-native-pagseguro-plugpag';
import type { PlugPagTransactionResult } from 'react-native-pagseguro-plugpag';

try {
  const result: PlugPagTransactionResult = await doPayment({
    type: PaymentType.DEBIT,
    amount: 1990, // amount in cents (R$ 19,90)
    installmentType: InstallmentType.A_VISTA,
    installments: 1,
  });
  console.log('Transaction code:', result.transactionCode);
} catch (error) {
  console.error('Payment failed:', error);
}
```

---

### Pagamento com Crédito

**À vista:**

```typescript
import { doPayment, PaymentType, InstallmentType } from 'react-native-pagseguro-plugpag';

const result = await doPayment({
  type: PaymentType.CREDIT,
  amount: 5000, // amount in cents (R$ 50,00)
  installmentType: InstallmentType.A_VISTA,
  installments: 1,
});
```

**Parcelado:**

```typescript
import { doPayment, PaymentType, InstallmentType } from 'react-native-pagseguro-plugpag';

// PARC_VENDEDOR: interest charged to merchant
// PARC_COMPRADOR: interest charged to customer
const result = await doPayment({
  type: PaymentType.CREDIT,
  amount: 12000, // amount in cents (R$ 120,00)
  installmentType: InstallmentType.PARC_VENDEDOR,
  installments: 3, // must be >= 2 for installment types
});
```

---

### Pagamento com PIX

```typescript
import { doPayment, PaymentType, InstallmentType } from 'react-native-pagseguro-plugpag';

const result = await doPayment({
  type: PaymentType.PIX,
  amount: 3500, // amount in cents (R$ 35,00)
  installmentType: InstallmentType.A_VISTA, // PIX always uses A_VISTA
  installments: 1,
});
```

---

### Estorno

**Estorno de cartão** (use `transactionCode` e `transactionId` do `PlugPagTransactionResult` original):

```typescript
import { doRefund, PlugPagVoidType } from 'react-native-pagseguro-plugpag';
import type { PlugPagTransactionResult } from 'react-native-pagseguro-plugpag';

// originalResult is the PlugPagTransactionResult from the original doPayment call
async function refundCardPayment(originalResult: PlugPagTransactionResult) {
  const refundResult = await doRefund({
    transactionCode: originalResult.transactionCode ?? '',
    transactionId: originalResult.transactionId ?? '',
    voidType: PlugPagVoidType.VOID_PAYMENT,
  });
  console.log('Refund complete:', refundResult.transactionCode);
}
```

**Estorno de PIX:**

```typescript
import { doRefund, PlugPagVoidType } from 'react-native-pagseguro-plugpag';

const refundResult = await doRefund({
  transactionCode: 'ORIGINAL_TRANSACTION_CODE',
  transactionId: 'ORIGINAL_TRANSACTION_ID',
  voidType: PlugPagVoidType.VOID_QRCODE,
});
```

---

### Impressão Personalizada

Imprima um arquivo de imagem bitmap na impressora integrada do terminal:

```typescript
import { printFromFile, PrintQuality, MIN_PRINTER_STEPS } from 'react-native-pagseguro-plugpag';

try {
  const result = await printFromFile({
    filePath: '/data/user/0/com.myapp/files/receipt.bmp',
    printerQuality: PrintQuality.HIGH,
    steps: MIN_PRINTER_STEPS, // minimum line feed after printing (70)
  });
  console.log('Printed successfully, steps:', result.steps);
} catch (error) {
  // error.code may be 'PLUGPAG_VALIDATION_ERROR' for invalid input
  console.error('Print failed:', error);
}
```

---

### Reimpressão de Comprovantes

Reimprima o comprovante da última transação sem precisar dos dados originais da transação.

**Reimpressão síncrona:**

```typescript
import {
  reprintCustomerReceipt,
  reprintEstablishmentReceipt,
} from 'react-native-pagseguro-plugpag';

// Customer copy
const customerResult = await reprintCustomerReceipt();

// Establishment copy
const establishmentResult = await reprintEstablishmentReceipt();
```

**Reimpressão assíncrona** (usa listener nativo do SDK):

```typescript
import {
  doAsyncReprintCustomerReceipt,
  doAsyncReprintEstablishmentReceipt,
} from 'react-native-pagseguro-plugpag';

const customerResult = await doAsyncReprintCustomerReceipt();
const establishmentResult = await doAsyncReprintEstablishmentReceipt();
```

Use as variantes síncronas para fluxos de reimpressão simples. Use as variantes assíncronas quando precisar do mecanismo orientado a eventos do SDK nativo.

---

### Hook de Progresso de Pagamento

Assine eventos de progresso de pagamento em tempo real durante uma chamada `doPayment` ou `doAsyncPayment`:

```tsx
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { usePaymentProgress } from 'react-native-pagseguro-plugpag';
import type { PlugPagPaymentProgressEvent } from 'react-native-pagseguro-plugpag';

function PaymentScreen() {
  const [progressEvent, setProgressEvent] =
    useState<PlugPagPaymentProgressEvent | null>(null);

  // useCallback ensures a stable reference across renders
  const handleProgress = useCallback((event: PlugPagPaymentProgressEvent) => {
    setProgressEvent(event);
  }, []);

  // Subscribes on mount, unsubscribes on unmount automatically
  usePaymentProgress(handleProgress);

  return (
    <View>
      {progressEvent && (
        <Text>
          Event {progressEvent.eventCode}: {progressEvent.customMessage}
        </Text>
      )}
    </View>
  );
}
```

---

## Referência de API

### Funções

| Função | Parâmetros | Retorno | Descrição |
|--------|-----------|---------|-----------|
| `initializeAndActivatePinPad` | `activationCode: string` | `Promise<PlugPagActivationSuccess>` | Ativa o PinPad de forma síncrona (I/O bloqueante via Dispatchers.IO) |
| `doAsyncInitializeAndActivatePinPad` | `activationCode: string` | `Promise<PlugPagActivationSuccess>` | Ativa o PinPad usando o listener assíncrono nativo do SDK |
| `doPayment` | `data: PlugPagPaymentRequest` | `Promise<PlugPagTransactionResult>` | Processa um pagamento de forma síncrona (I/O bloqueante) |
| `doAsyncPayment` | `data: PlugPagPaymentRequest` | `Promise<PlugPagTransactionResult>` | Processa um pagamento usando o listener assíncrono nativo do SDK |
| `subscribeToPaymentProgress` | `callback: (event: PlugPagPaymentProgressEvent) => void` | `() => void` | Assina eventos de progresso de pagamento; retorna uma função para cancelar a assinatura |
| `doRefund` | `data: PlugPagRefundRequest` | `Promise<PlugPagTransactionResult>` | Processa um estorno (cartão ou PIX) |
| `printFromFile` | `data: PrintRequest` | `Promise<PrintResult>` | Imprime um arquivo bitmap na impressora integrada do terminal |
| `reprintCustomerReceipt` | — | `Promise<PrintResult>` | Reimprimi a via do cliente do último comprovante (síncrono) |
| `reprintEstablishmentReceipt` | — | `Promise<PrintResult>` | Reimprimi a via do estabelecimento do último comprovante (síncrono) |
| `doAsyncReprintCustomerReceipt` | — | `Promise<PrintResult>` | Reimprimi a via do cliente usando o listener assíncrono nativo do SDK |
| `doAsyncReprintEstablishmentReceipt` | — | `Promise<PrintResult>` | Reimprimi a via do estabelecimento usando o listener assíncrono nativo do SDK |

---

### Hooks

| Hook | Parâmetros | Retorno | Descrição |
|------|-----------|---------|-----------|
| `usePaymentProgress` | `callback: (event: PlugPagPaymentProgressEvent) => void` | `void` | Assina eventos de progresso de pagamento durante o tempo de vida do componente; cancela a assinatura automaticamente no unmount |

---

### Tipos e Interfaces

#### `PlugPagPaymentRequest`

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `type` | `PlugPagPaymentType` | Sim | Método de pagamento: `CREDIT`, `DEBIT` ou `PIX` |
| `amount` | `number` | Sim | Valor em centavos (ex: `1990` = R$ 19,90) |
| `installmentType` | `PlugPagInstallmentType` | Sim | Plano de parcelamento: `A_VISTA`, `PARC_VENDEDOR` ou `PARC_COMPRADOR` |
| `installments` | `number` | Sim | Número de parcelas (deve ser ≥ 2 para tipos `PARC_*`) |
| `userReference` | `string` | Não | Referência interna opcional (máx. 10 caracteres) |
| `printReceipt` | `boolean` | Não | Se deve imprimir um comprovante após a transação |

#### `PlugPagRefundRequest`

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `transactionCode` | `string` | Sim | Código da transação original do `PlugPagTransactionResult` |
| `transactionId` | `string` | Sim | ID da transação original do `PlugPagTransactionResult` |
| `voidType` | `PlugPagVoidTypeValue` | Sim | Método de estorno: `VOID_PAYMENT` (cartão) ou `VOID_QRCODE` (PIX) |
| `printReceipt` | `boolean` | Não | Se deve imprimir um comprovante após o estorno |

#### `PlugPagTransactionResult`

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `transactionCode` | `string \| null` | Sim | Código único da transação |
| `transactionId` | `string \| null` | Sim | ID único da transação |
| `date` | `string \| null` | Sim | Data da transação |
| `time` | `string \| null` | Sim | Hora da transação |
| `hostNsu` | `string \| null` | Sim | Número NSU do host |
| `cardBrand` | `string \| null` | Sim | Bandeira do cartão (ex: Visa, Mastercard) |
| `bin` | `string \| null` | Sim | BIN do cartão (6 primeiros dígitos) |
| `holder` | `string \| null` | Sim | Identificador do portador do cartão |
| `userReference` | `string \| null` | Sim | Referência do usuário passada na requisição |
| `terminalSerialNumber` | `string \| null` | Sim | Número de série do terminal |
| `amount` | `string \| null` | Sim | Valor cobrado (string formatada) |
| `availableBalance` | `string \| null` | Sim | Saldo disponível (débito/PIX) |
| `nsu` | `string \| null` | Não | Número NSU |
| `cardApplication` | `string \| null` | Não | Identificador da aplicação do cartão |
| `label` | `string \| null` | Não | Rótulo do cartão |
| `holderName` | `string \| null` | Não | Nome do portador do cartão |
| `extendedHolderName` | `string \| null` | Não | Nome estendido do portador do cartão |
| `autoCode` | `string \| null` | Não | Código de autorização |

#### `PlugPagPaymentProgressEvent`

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `eventCode` | `number` | Sim | Código numérico do evento proveniente do SDK PagBank |
| `customMessage` | `string \| null` | Sim | Mensagem opcional associada ao evento |

#### `PrintRequest`

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `filePath` | `string` | Sim | Caminho absoluto para o arquivo bitmap a imprimir |
| `printerQuality` | `PrintQualityValue` | Não | Qualidade de impressão (1–4); usa o padrão médio se omitido |
| `steps` | `number` | Não | Passos de avanço de linha após a impressão; use `MIN_PRINTER_STEPS` (70) como mínimo |

#### `PrintResult`

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `result` | `'ok'` | Sim | Sempre `'ok'` em caso de sucesso |
| `steps` | `number` | Sim | Número de passos de avanço de linha aplicados |

#### `PlugPagActivationSuccess`

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `result` | `'ok'` | Sim | Sempre `'ok'` na ativação bem-sucedida |

---

### Constantes

#### `PaymentType`

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `PaymentType.CREDIT` | `'CREDIT'` | Pagamento com cartão de crédito |
| `PaymentType.DEBIT` | `'DEBIT'` | Pagamento com cartão de débito |
| `PaymentType.PIX` | `'PIX'` | Pagamento instantâneo PIX |

#### `InstallmentType`

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `InstallmentType.A_VISTA` | `'A_VISTA'` | Cobrança única (sem parcelamento) |
| `InstallmentType.PARC_VENDEDOR` | `'PARC_VENDEDOR'` | Parcelamento com juros cobrados do estabelecimento |
| `InstallmentType.PARC_COMPRADOR` | `'PARC_COMPRADOR'` | Parcelamento com juros cobrados do comprador |

#### `PlugPagVoidType`

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `PlugPagVoidType.VOID_PAYMENT` | `'VOID_PAYMENT'` | Estornar um pagamento com cartão |
| `PlugPagVoidType.VOID_QRCODE` | `'VOID_QRCODE'` | Estornar um pagamento PIX |

#### `PrintQuality`

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `PrintQuality.LOW` | `1` | Qualidade de impressão baixa |
| `PrintQuality.MEDIUM` | `2` | Qualidade de impressão média |
| `PrintQuality.HIGH` | `3` | Qualidade de impressão alta |
| `PrintQuality.MAX` | `4` | Qualidade de impressão máxima |

#### `MIN_PRINTER_STEPS`

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `MIN_PRINTER_STEPS` | `70` | Passos mínimos recomendados de avanço de linha após a impressão |

---

### Códigos de Erro

#### Ativação

| Código de Erro | Quando é Lançado | Significado |
|----------------|-----------------|-------------|
| `PLUGPAG_INITIALIZATION_ERROR` | SDK retorna `result != RET_OK` | O SDK PagBank rejeitou a solicitação de ativação |
| `PLUGPAG_INTERNAL_ERROR` | Exceção inesperada capturada | Falha de IPC, serviço inacessível ou estado inesperado do SDK |

#### Pagamento

| Código de Erro | Quando é Lançado | Significado |
|----------------|-----------------|-------------|
| `PLUGPAG_PAYMENT_ERROR` | SDK retorna `result != RET_OK` | O SDK PagBank rejeitou o pagamento (cartão recusado, problema de rede, etc.) |
| `PLUGPAG_INTERNAL_ERROR` | Exceção inesperada capturada | Falha de IPC, serviço inacessível ou estado inesperado do SDK |

#### Estorno

| Código de Erro | Quando é Lançado | Significado |
|----------------|-----------------|-------------|
| `PLUGPAG_REFUND_ERROR` | SDK retorna `result != RET_OK` | O SDK PagBank rejeitou o estorno |
| `PLUGPAG_INTERNAL_ERROR` | Exceção inesperada capturada | Falha de IPC, serviço inacessível ou estado inesperado do SDK |

#### Impressão

| Código de Erro | Quando é Lançado | Significado |
|----------------|-----------------|-------------|
| `PLUGPAG_PRINT_ERROR` | SDK retorna `result != RET_OK` | O SDK PagBank reportou um erro de impressora |
| `PLUGPAG_INTERNAL_ERROR` | Exceção inesperada capturada | Falha de IPC, serviço inacessível ou estado inesperado do SDK |
| `PLUGPAG_VALIDATION_ERROR` | Parâmetros de entrada inválidos | `filePath` está vazio, `steps` < 0 ou `printerQuality` fora do intervalo 1–4 |

---

## Limitações e Escopo

- **iOS não é suportado.** O SDK PlugPag da PagSeguro é exclusivo para Android. Chamar qualquer função da biblioteca no iOS lançará um erro explícito.
- **Dispositivos que não são SmartPOS não são suportados.** A biblioteca é direcionada para terminais SmartPOS PagBank (A920, A930, P2, S920). O comportamento em celulares Android comuns é indefinido.
- **Relatórios financeiros e consultas de extrato estão fora do escopo.** Esta biblioteca cobre apenas operações de pagamento.
- **NFC autônomo sem PlugPag está fora do escopo.** Todas as interações NFC passam pelo SDK PlugPag.

---

## Contribuindo

Contribuições são bem-vindas! Leia [CONTRIBUTING.md](./CONTRIBUTING.md) antes de enviar um pull request, e revise o [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) para entender as expectativas da comunidade.

---

## Licença

MIT — veja [LICENSE](./LICENSE)
