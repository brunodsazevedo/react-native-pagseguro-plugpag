# PRD — Feature 006: Custom Printing (Impressão Personalizada)

**Status**: Rascunho
**Data**: 2026-03-29
**Branch proposta**: `feature/006-custom-printing`

---

## 1. Contexto e Motivação

Os terminais PagBank SmartPOS (A920, A930, P2, S920) possuem impressora térmica integrada.
Atualmente a biblioteca expõe `printReceipt: true` nos métodos de pagamento (feature/003),
que aciona a impressão automática do comprovante gerado pelo SDK — sem qualquer controle
sobre o layout.

Desenvolvedores que precisam imprimir recibos de loja, notas fiscais simplificadas,
etiquetas ou qualquer layout personalizado não têm caminho hoje. A pergunta que motiva
este PRD é:

> **O SDK `PlugPagServiceWrapper` expõe algum método que permita impressão de conteúdo
> personalizado, fora do comprovante padrão de transação?**

Este documento registra a pesquisa realizada para responder essa pergunta, a conclusão
de viabilidade e, a partir dela, a proposta de implementação.

---

## 2. Pesquisa de Viabilidade

### 2.1 Análise da documentação oficial do SDK

Fonte: `https://pagseguro.github.io/pagseguro-sdk-plugpagservicewrapper/`
SDK alvo: `wrapper:1.33.0`

#### Classe `PlugPagPrinterData`

O SDK define uma classe de dados exclusiva para impressão:

```kotlin
data class PlugPagPrinterData(
    val filePath: String,   // Caminho absoluto do arquivo no dispositivo
    val printerQuality: Int, // Qualidade: 1 (baixa) a 4 (máxima)
    var steps: Int           // Linhas em branco após a impressão
                             // Mínimo documentado: PlugPag.MIN_PRINTER_STEPS = 70
)
```

Formatos de arquivo aceitos: **PNG, JPEG, BMP**
Largura recomendada: **1155px** — imagens maiores são redimensionadas automaticamente pelo SDK.

#### Métodos de impressão encontrados na classe `PlugPag`

**`printFromFile` — impressão personalizada a partir de arquivo**
```kotlin
fun printFromFile(printerData: PlugPagPrinterData): PlugPagPrintResult
```
- Imprime qualquer imagem local passada via `filePath`
- É o único método que permite conteúdo completamente customizado pelo desenvolvedor
- Bloqueante — exige execução fora da main thread
- Lança `PlugPagException` em falha (capturável como `Exception`)

**`reprintCustomerReceipt` — reimpressão de comprovante (via cliente)**
```kotlin
fun reprintCustomerReceipt(): PlugPagPrintResult
```
- Reimprime a via do cliente da última transação aprovada
- Bloqueante

**`reprintStablishmentReceipt` — reimpressão de comprovante (via estabelecimento)**
```kotlin
fun reprintStablishmentReceipt(): PlugPagPrintResult
```
- Reimprime a via do estabelecimento da última transação aprovada
- Bloqueante
- O SDK usa o typo `Stablishment` (falta o 'e') — registrado como decisão de design

#### Classe de resultado `PlugPagPrintResult`

```kotlin
class PlugPagPrintResult(
    val result: Int,        // PlugPag.RET_OK (0) em caso de sucesso
    val message: String?,   // Mensagem descritiva de erro
    val errorCode: String?, // Código de erro estruturado
    val steps: Int          // Linhas efetivamente impressas
)
```

#### Constantes relevantes

| Constante | Valor | Uso |
|---|---|---|
| `PlugPag.RET_OK` | `0` | Verificação de sucesso em qualquer resultado |
| `PlugPag.MIN_PRINTER_STEPS` | `70` | Valor mínimo de `steps` documentado |

#### Outros métodos de impressão encontrados (fora do escopo desta feature)

| Método | Descrição | Por que fora do escopo |
|---|---|---|
| `setPlugPagCustomPrinterLayout(layout)` | Customiza cores e textos da tela de confirmação de impressão no terminal | UI do terminal, não conteúdo impresso — feature separada futura |
| `setPrinterListener(listener)` | Define callbacks durante impressão | Infraestrutura de evento — pode ser adicionado futuramente |
| `doPrintAction(action, phoneNumber?)` | Controla fluxo (imprimir, apagar, enviar SMS) | Fluxo avançado — feature separada futura |
| `setPrintActionListener(listener)` | Callbacks de ação de impressão | Vinculado ao `doPrintAction` |

#### Aviso importante da documentação oficial

> "As funcionalidades de impressão livre sem TerminalService foram desativadas, e ao serem
> chamadas através de versões de WrapperPPS antigas retornarão erro de descontinuação."

**Interpretação:** `printFromFile` exige que o `PlugPag` esteja devidamente conectado ao
`PlugPagService` via binding. Isso já é garantido pela inicialização `PlugPag(context)` que
o módulo já realiza — não há requisito adicional de integração.

#### Threads: variantes assíncronas no SDK

O SDK **não oferece variante assíncrona para `printFromFile`**. Os métodos de reimpressão
possuem wrappers async internos (`asyncReprintCustomerReceipt` /
`asyncReprintEstablishmentReceipt`), mas estes gerenciam thread internamente e não alteram
a interface exposta — o padrão `Dispatchers.IO` já adotado por `doPayment` é suficiente
para todos os três métodos.

---

### 2.2 Análise da biblioteca legada de referência

Fonte: `https://github.com/brunodsazevedo/react-native-pagseguro-plugpag` (Java)

A biblioteca legada já expunha `printFromFile` em seu módulo Android:

```java
// Implementação Java legada — referência de uso direto do SDK
PlugPagPrinterData file = new PlugPagPrinterData(filePath, 4, 0);
PlugPagPrintResult result = plugPag.printFromFile(file);
```

**Observações relevantes extraídas da implementação legada:**
- `printerQuality: 4` era o padrão usado (máxima qualidade)
- `steps: 0` era passado, apesar do `MIN_PRINTER_STEPS = 70` na documentação — o SDK
  aceita e interpreta internamente sem erro
- Nenhuma validação de `filePath` era feita antes de passar ao SDK; erros eram
  propagados como exceção
- A biblioteca legada **não expunha** `reprintCustomerReceipt` nem `reprintStablishmentReceipt`

---

### 2.3 Conclusão de Viabilidade

| Pergunta | Resposta |
|---|---|
| O SDK possui método para impressão personalizada (não-comprovante)? | **Sim** — `printFromFile(PlugPagPrinterData)` |
| O método existia na biblioteca legada? | **Sim** — confirmado na implementação Java |
| O método ainda existe no wrapper 1.33.0? | **Sim** — presente na documentação oficial atual |
| Há suporte a imagens (PNG/JPEG/BMP)? | **Sim** — formatos documentados |
| Há outros métodos de impressão aproveitáveis? | **Sim** — `reprintCustomerReceipt` e `reprintEstablishmentReceipt` |
| Há métodos de impressão de texto puro? | **Não** — o SDK não suporta neste nível de abstração |
| A implementação exige algum requisito novo de integração? | **Não** — o binding com `PlugPagService` já é atendido |

**A feature é viável.** Os três métodos (`printFromFile`, `reprintCustomerReceipt`,
`reprintEstablishmentReceipt`) serão expostos pela biblioteca.

---

## 3. Escopo da Feature

Com base na pesquisa acima, esta feature expõe:

### 3.1 Dentro do Escopo

| Método a expor | Método SDK | Descrição |
|---|---|---|
| `printFromFile(data)` | `plugPag.printFromFile(PlugPagPrinterData)` | Imprime imagem (PNG/JPEG/BMP) a partir de caminho de arquivo local |
| `reprintCustomerReceipt()` | `plugPag.reprintCustomerReceipt()` | Reimprime via do cliente da última transação |
| `reprintEstablishmentReceipt()` | `plugPag.reprintStablishmentReceipt()` | Reimprime via do estabelecimento da última transação |

### 3.2 Fora do Escopo (nesta iteração)

- Impressão de texto puro / HTML — SDK não suporta
- Geração de imagem a partir de componentes React Native — responsabilidade do app consumidor
- `setPlugPagCustomPrinterLayout` — customização da UI do terminal durante impressão
- `doPrintAction` / `setPrintActionListener` — controle avançado do fluxo de impressão

---

## 4. API Pública Proposta (TypeScript)

### 4.1 Interfaces e tipos

```typescript
// Qualidade da impressão — espelha os valores documentados pelo SDK
export const PrinterQuality = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  BEST: 4,
} as const;

export type PlugPagPrinterQuality =
  (typeof PrinterQuality)[keyof typeof PrinterQuality];

// Dados de entrada para printFromFile
export interface PlugPagPrinterRequest {
  filePath: string;                       // Caminho absoluto do arquivo no dispositivo
  printerQuality?: PlugPagPrinterQuality; // Padrão: PrinterQuality.BEST (4)
  steps?: number;                         // Linhas em branco após impressão. Padrão: 70
}

// Resultado de qualquer operação de impressão bem-sucedida
export interface PlugPagPrintResult {
  result: 'ok';
  steps: number; // Total de linhas impressas retornado pelo SDK
}
```

### 4.2 Funções exportadas

```typescript
export async function printFromFile(
  data: PlugPagPrinterRequest
): Promise<PlugPagPrintResult>

export async function reprintCustomerReceipt(): Promise<PlugPagPrintResult>

export async function reprintEstablishmentReceipt(): Promise<PlugPagPrintResult>
```

### 4.3 Adições à Spec TurboModule (`NativePagseguroPlugpag.ts`)

```typescript
printFromFile(data: Object): Promise<Object>;
reprintCustomerReceipt(): Promise<Object>;
reprintEstablishmentReceipt(): Promise<Object>;
```

---

## 5. Design da Implementação Kotlin

### 5.1 Threading

Todos os três métodos fazem chamadas bloqueantes de IPC ao SDK. O mesmo padrão de
`doPayment` se aplica:

```kotlin
// EXCEPTION (Constituição Princípio VI): printFromFile é bloqueante por IPC.
// Executar na main thread causaria ANR. Dispatchers.IO é necessário.
CoroutineScope(Dispatchers.IO).launch {
    try {
        val result = plugPag.printFromFile(printerData)
        withContext(Dispatchers.Main) {
            if (result.result != PlugPag.RET_OK) {
                promise.reject("PLUGPAG_PRINT_ERROR", buildPrintErrorUserInfo(result))
            } else {
                promise.resolve(buildPrintResultMap(result))
            }
        }
    } catch (e: Exception) {
        withContext(Dispatchers.Main) {
            promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
        }
    }
}
```

O mesmo padrão de `try/catch` se aplica aos métodos `reprintCustomerReceipt` e
`reprintEstablishmentReceipt`. Os três métodos são bloqueantes por IPC e devem capturar
exceptions genéricas, rejeitando com `PLUGPAG_INTERNAL_ERROR` via `buildInternalErrorUserInfo`.
Esse padrão é idêntico ao já implementado em `doPayment`.

### 5.2 Serialização de entrada (`printFromFile`)

```kotlin
// ReadableMap → PlugPagPrinterData
val filePath = data.getString("filePath") ?: return promise.reject(...)
val printerQuality = if (data.hasKey("printerQuality")) data.getInt("printerQuality") else 4
val steps = if (data.hasKey("steps")) data.getInt("steps") else PlugPag.MIN_PRINTER_STEPS
val printerData = PlugPagPrinterData(filePath, printerQuality, steps)
```

### 5.3 Serialização de saída

```kotlin
private fun buildPrintResultMap(result: PlugPagPrintResult): WritableNativeMap {
    val map = WritableNativeMap()
    map.putString("result", "ok")
    map.putInt("steps", result.steps)
    return map
}

private fun buildPrintErrorUserInfo(result: PlugPagPrintResult): WritableNativeMap {
    val map = WritableNativeMap()
    map.putInt("result", result.result)
    map.putString("errorCode", result.errorCode ?: "")
    map.putString("message", result.message?.takeIf { it.isNotEmpty() } ?: "Unknown error")
    return map
}
```

### 5.4 Import adicional no módulo Kotlin

```kotlin
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPrinterData
// PlugPagPrintResult já está importado desde a feature/003
```

---

## 6. Validações na Camada JS

```typescript
function validatePrinterRequest(data: PlugPagPrinterRequest): void {
  if (!data.filePath || data.filePath.trim() === '') {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: printFromFile() — filePath must not be empty.'
    );
  }
  if (
    data.printerQuality !== undefined &&
    (data.printerQuality < 1 || data.printerQuality > 4)
  ) {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: printFromFile() — printerQuality must be between 1 and 4.'
    );
  }
  if (data.steps !== undefined && data.steps < 0) {
    throw new Error(
      '[react-native-pagseguro-plugpag] ERROR: printFromFile() — steps must be >= 0.'
    );
  }
}
```

---

## 7. Códigos de Erro

| Código | Quando usar |
|---|---|
| `PLUGPAG_PRINT_ERROR` | SDK retornou `result != RET_OK` em qualquer operação de impressão |
| `PLUGPAG_INTERNAL_ERROR` | Exception não-SDK capturada durante impressão |

---

## 8. Arquivos Afetados

### 8.1 Arquivos existentes — modificações necessárias

| Arquivo | Mudança |
|---|---|
| [src/NativePagseguroPlugpag.ts](src/NativePagseguroPlugpag.ts) | Adicionar 3 novos métodos à interface `Spec` |
| [src/index.tsx](src/index.tsx) | Adicionar `PrinterQuality`, interfaces, validação e funções exportadas |
| [android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt](android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt) | Implementar os 3 métodos + helpers `buildPrintResultMap` e `buildPrintErrorUserInfo` |

### 8.2 Novos arquivos — criação necessária

| Arquivo | Propósito |
|---|---|
| `src/__tests__/printing.test.tsx` | Testes unitários JS (TDD — escritos antes da implementação) |
| `android/src/test/java/com/pagseguroplugpag/PrintingTest.kt` | Testes de integração Kotlin (JUnit 5 + Mockk) |
| `specs/006-custom-printing/spec.md` | Especificação permanente da feature |
| `specs/006-custom-printing/plan.md` | Plano de implementação |
| `specs/006-custom-printing/tasks.md` | Tasks de desenvolvimento |

### 8.3 Codegen — regeneração obrigatória

Após alterar `src/NativePagseguroPlugpag.ts`:

```bash
cd example/android && ./gradlew generateCodegenArtifactsFromSchema
```

Arquivo gerado afetado:
```
android/build/generated/source/codegen/java/com/pagseguroplugpag/NativePagseguroPlugpagSpec.java
```

---

## 9. Requisitos de Teste

### 9.1 Testes JS (Jest) — cenários por função

| Cenário | Expectativa |
|---|---|
| iOS → qualquer método | Rejeita com `ERROR: <método>() is not available on iOS...` |
| `printFromFile` + `filePath` vazio | Rejeita com erro de validação antes de chamar o nativo |
| `printFromFile` + `printerQuality` fora de 1–4 | Rejeita com erro de validação |
| `printFromFile` + `steps` negativo | Rejeita com erro de validação |
| Android + SDK sucesso | Resolve com `PlugPagPrintResult` `{ result: 'ok', steps: N }` |
| Android + SDK retorna erro | Rejeita com `PLUGPAG_PRINT_ERROR` |
| Android + exception interna | Rejeita com `PLUGPAG_INTERNAL_ERROR` |

### 9.2 Testes Kotlin (JUnit 5 + Mockk)

```kotlin
@Test fun `printFromFile resolve com sucesso quando SDK retorna RET_OK`()
@Test fun `printFromFile rejeita com PLUGPAG_PRINT_ERROR quando SDK retorna erro`()
@Test fun `printFromFile rejeita com PLUGPAG_INTERNAL_ERROR quando SDK lança exceção`()
@Test fun `reprintCustomerReceipt resolve com sucesso quando SDK retorna RET_OK`()
@Test fun `reprintCustomerReceipt rejeita com PLUGPAG_PRINT_ERROR quando SDK retorna erro`()
@Test fun `reprintCustomerReceipt rejeita com PLUGPAG_INTERNAL_ERROR quando SDK lança exceção`()
@Test fun `reprintEstablishmentReceipt resolve com sucesso quando SDK retorna RET_OK`()
@Test fun `reprintEstablishmentReceipt rejeita com PLUGPAG_PRINT_ERROR quando SDK retorna erro`()
@Test fun `reprintEstablishmentReceipt rejeita com PLUGPAG_INTERNAL_ERROR quando SDK lança exceção`()
```

---

## 10. Decisões de Design

### 10.1 `steps` — padrão 70, mínimo 0

A biblioteca legada usava `steps: 0` e funcionava. A documentação define
`MIN_PRINTER_STEPS = 70`. Adotamos `70` como padrão na API (segue a documentação), mas
o consumidor pode passar `0` — o SDK trata internamente. Não bloquear `steps < 70`
evita regressão com código legado.

### 10.2 Sem variante `doAsync` para `printFromFile`

O SDK não oferece callback listener para `printFromFile`. A thread é gerenciada via
`Dispatchers.IO` — do ponto de vista do JS, o método já é assíncrono (retorna Promise).
Expor uma variante `doAsyncPrintFromFile` seria redundante e sem benefício concreto.

### 10.3 Correção do typo `Stablishment`

O SDK usa `reprintStablishmentReceipt` (typo). A API pública desta biblioteca expõe
`reprintEstablishmentReceipt` (correto). O módulo Kotlin chama o nome incorreto do SDK
internamente — o typo fica isolado na camada nativa.

### 10.4 Geração da imagem é responsabilidade do app consumidor

Esta biblioteca recebe apenas o `filePath` de uma imagem já existente no dispositivo.
A geração do conteúdo visual (layout do recibo, etc.) é responsabilidade do app.
Sugestões para o app consumidor:

- `react-native-view-shot` — captura de View React Native como PNG
- `react-native-canvas` — desenho programático
- Qualquer solução que produza PNG/JPEG/BMP com largura ~1155px

---

## 11. Exemplo de Uso (consumidor da biblioteca)

```typescript
import {
  printFromFile,
  reprintCustomerReceipt,
  reprintEstablishmentReceipt,
  PrinterQuality,
} from 'react-native-pagseguro-plugpag';

// Impressão de recibo personalizado gerado pelo app
try {
  const result = await printFromFile({
    filePath: '/data/data/com.myapp/files/custom-receipt.png',
    printerQuality: PrinterQuality.BEST,
    steps: 100,
  });
  console.log('Impressão concluída', result);
} catch (error) {
  console.error('Erro na impressão', error);
}

// Reimpressão dos comprovantes da última transação
await reprintCustomerReceipt();
await reprintEstablishmentReceipt();
```

---

## 12. Checklist de Implementação (PR)

- [ ] Testes JS escritos **antes** da implementação (TDD) e confirmados como falhando
- [ ] Testes Kotlin escritos **antes** da implementação (TDD) e confirmados como falhando
- [ ] `src/NativePagseguroPlugpag.ts` atualizado com os 3 novos métodos
- [ ] Codegen regenerado (`generateCodegenArtifactsFromSchema`)
- [ ] `src/index.tsx` com `PrinterQuality`, interfaces, validações e funções exportadas
- [ ] `PagseguroPlugpagModule.kt` com os 3 métodos implementados + helpers de serialização
- [ ] `yarn lint` passando sem erros ou avisos
- [ ] `yarn typecheck` passando
- [ ] `yarn test` passando com 100% de cobertura das adições
- [ ] Zero `any` sem exceção documentada
- [ ] Artefatos de spec em `specs/006-custom-printing/`
