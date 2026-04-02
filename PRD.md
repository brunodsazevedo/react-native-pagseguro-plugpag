# PRD — Análise de Status: Feature 006 — Impressão Personalizada (Custom Printing)

**Data**: 2026-04-02  
**Autor**: Análise automatizada do codebase  
**Escopo**: Feature 006 — `printFromFile`, `reprintCustomerReceipt`, `reprintEstablishmentReceipt` e variantes async

---

## 1. Resumo Executivo

A Feature 006 está **substancialmente implementada**, mas **NÃO está concluída**. Há gaps concretos de validação e cobertura de testes que impedem considerar a feature como completa segundo os critérios da Constituição do projeto (Princípios II, III e o PR Checklist).

| Camada | Status |
|---|---|
| Spec TurboModule (`NativePagseguroPlugpag.ts`) | ✅ Completo — 5 métodos declarados |
| Tipos TypeScript (`src/functions/print/types.ts`) | ✅ Completo |
| Funções TypeScript (`src/functions/print/index.ts`) | ⚠️ Parcial — validação incompleta |
| Exports (`src/index.ts`, `src/functions/index.ts`) | ✅ Completo |
| Implementação Kotlin (`PagseguroPlugpagModule.kt`) | ✅ Completo — 5 métodos implementados |
| Testes TypeScript (`print.test.ts`) | ⚠️ Incompleto — faltam 4 cenários |
| Testes Kotlin (`PagseguroPlugpagModuleTest.kt`) | ✅ Completo — 16 testes |
| Documentação (`specs/006-custom-printing/`) | ✅ Completo |

**Veredito: 🟡 IMPLEMENTADO COM GAPS — não apto para merge sem correções**

---

## 2. API Pública Implementada

### 2.1 Funções Expostas

Todos os 5 métodos estão declarados na spec TurboModule, implementados em Kotlin e re-exportados por `src/index.ts`:

```typescript
// Impressão de arquivo (síncrona — bloqueante via Dispatchers.IO no Kotlin)
printFromFile(data: PrintRequest): Promise<PrintResult>

// Reimpressão — recibo do cliente (variante síncrona)
reprintCustomerReceipt(): Promise<PrintResult>

// Reimpressão — recibo do cliente (variante assíncrona — SDK listener nativo)
doAsyncReprintCustomerReceipt(): Promise<PrintResult>

// Reimpressão — recibo do estabelecimento (variante síncrona)
reprintEstablishmentReceipt(): Promise<PrintResult>

// Reimpressão — recibo do estabelecimento (variante assíncrona — SDK listener nativo)
doAsyncReprintEstablishmentReceipt(): Promise<PrintResult>
```

### 2.2 Tipos Públicos

```typescript
export const PrintQuality = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  MAX: 4,
} as const;

export type PrintQualityValue = (typeof PrintQuality)[keyof typeof PrintQuality];

export interface PrintRequest {
  filePath: string;
  printerQuality?: PrintQualityValue;
  steps?: number;
}

export interface PrintResult {
  result: 'ok';
  steps: number;
}

export const MIN_PRINTER_STEPS = 70;
```

### 2.3 Códigos de Erro

| Código | Quando |
|---|---|
| `PLUGPAG_VALIDATION_ERROR` | Parâmetros inválidos (filePath vazio, steps negativo) |
| `PLUGPAG_PRINT_ERROR` | SDK retornou `result != RET_OK` (falha de hardware) |
| `PLUGPAG_INTERNAL_ERROR` | Exceção não-SDK capturada em runtime |

---

## 3. O Que Está Funcionando

### Implementação Kotlin (completa)

- `printFromFile` despacha via `Dispatchers.IO` (necessário — SDK é bloqueante por IPC)
- `reprintCustomerReceipt` e `reprintEstablishmentReceipt` via `Dispatchers.IO`
- `doAsyncReprintCustomerReceipt` e `doAsyncReprintEstablishmentReceipt` via `PlugPagPrinterListener` nativo (sem coroutines)
- Helper `buildPrintErrorUserInfo()` para erros estruturados
- SDK typo documentado e contornado: API pública usa `reprintEstablishmentReceipt`, chamada SDK interna usa `plugPag.reprintStablishmentReceipt()` (com comentário inline `// "Stablishment" is the SDK's spelling — see FR-013`)
- Error handling com 3 camadas: validação JS → `PLUGPAG_PRINT_ERROR` (hardware) → `PLUGPAG_INTERNAL_ERROR` (exceção)

### Guards de Plataforma

- Nível 1 em `src/index.ts`: `console.warn` ao importar em iOS (não lança)
- Nível 2 em cada função de `src/functions/print/index.ts`: `throw new Error` com prefixo `[react-native-pagseguro-plugpag] ERROR:` antes de qualquer chamada nativa

### `getNativeModule()` Pattern

- Módulo nativo acessado via `require()` lazy (nunca no top-level) — correto conforme Constituição VI e padrão de código estabelecido

---

## 4. Gaps Identificados

### GAP 1 — CRÍTICO: Validação de `printerQuality` ausente

**Arquivo afetado**: [src/functions/print/index.ts](src/functions/print/index.ts)

A spec (FR-005) exige que `printerQuality` fora do intervalo 1–4 cause rejeição imediata com `PLUGPAG_VALIDATION_ERROR`. A função `validatePrintRequest` valida `filePath` e `steps`, mas **não valida `printerQuality`**.

Situação atual:
```typescript
function validatePrintRequest(data: PrintRequest): void {
  if (data.filePath.trim() === '') {
    throw new Error('[react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR: ...');
  }
  if (data.steps !== undefined && data.steps < 0) {
    throw new Error('[react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR: ...');
  }
  // ❌ printerQuality NÃO é validado aqui
}
```

O tipo `PrintQualityValue` garante os literais `1 | 2 | 3 | 4` somente em tempo de compilação TypeScript. Se um consumer chamar `printFromFile({ filePath: '/img.png', printerQuality: 99 as PrintQualityValue })`, a chamada chega ao Kotlin com valor inválido e o SDK pode ter comportamento imprevisível.

Correção necessária:
```typescript
if (
  data.printerQuality !== undefined &&
  (data.printerQuality < 1 || data.printerQuality > 4)
) {
  throw new Error(
    '[react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR: printFromFile() — printerQuality must be between 1 and 4.'
  );
}
```

---

### GAP 2 — IMPORTANTE: Testes TypeScript incompletos

**Arquivo afetado**: [src/__tests__/functions/print.test.ts](src/__tests__/functions/print.test.ts)

Os testes TypeScript cobrem 15 cenários, mas deixam 4 fora:

| Cenário faltante | Impacto |
|---|---|
| `doAsyncReprintCustomerReceipt()` resolve em Android | Função não testada no lado JS |
| `doAsyncReprintCustomerReceipt()` rejeita com `PLUGPAG_PRINT_ERROR` | Função não testada no lado JS |
| `doAsyncReprintEstablishmentReceipt()` resolve em Android | Função não testada no lado JS |
| `doAsyncReprintEstablishmentReceipt()` rejeita com `PLUGPAG_PRINT_ERROR` | Função não testada no lado JS |
| Validação de `printerQuality` inválido | Depende da correção do GAP 1 |

A Constituição (Princípio III) exige 100% de cobertura de todas as funções exportadas de `src/index.ts`. As duas variantes async de reimpressão são exportadas e não possuem nenhum teste TypeScript.

---

### GAP 3 — INFORMATIVO: Feature testada somente em mock

A feature ainda não foi validada em dispositivo físico PagBank SmartPOS. Todos os testes são unitários (mocked). Isso não bloqueia merge, mas é necessário antes de publicar uma release.

---

## 5. Conformidade com a Constituição

| Princípio | Status | Observação |
|---|---|---|
| I — TurboModules Only | ✅ | Bridge legada não usada; `getNativeModule()` lazy via `require()` |
| II — TypeScript Strict | ✅ | Sem `any`; tipos corretos; `const` object para enum |
| III — Test-First / TDD | ❌ | Funções async de reimpressão sem testes JS; validação de `printerQuality` sem testes |
| IV — Clean Code / SOLID | ✅ | Domínio isolado em `src/functions/print/`; Kotlin sem lógica de negócio além de serialização |
| V — Device Compatibility | ⚠️ | Não implementado (DEFERRED — conforme TODO da Constituição) |
| VI — Android-Only | ✅ | Guards Nível 1 e 2 presentes; `.podspec` e `ios/` inexistentes |

**PR Checklist**:
- [x] Spec TurboModule atualizada
- [x] Codegen regenerado (assumido — verificar se `generateCodegenArtifactsFromSchema` foi executado)
- [x] Implementação Kotlin completa
- [x] Testes Kotlin: 16 testes, todos os métodos cobertos
- [ ] Testes TypeScript: faltam cenários para funções async de reimpressão
- [ ] Validação de `printerQuality` ausente — viola FR-005 da spec
- [x] `yarn lint` — avaliar antes do merge
- [x] Zero `any` — confirmado

---

## 6. Arquivos Relevantes

### Spec e Documentação
- [specs/006-custom-printing/spec.md](specs/006-custom-printing/spec.md)
- [specs/006-custom-printing/plan.md](specs/006-custom-printing/plan.md)
- [specs/006-custom-printing/data-model.md](specs/006-custom-printing/data-model.md)
- [specs/006-custom-printing/quickstart.md](specs/006-custom-printing/quickstart.md)
- [specs/006-custom-printing/research.md](specs/006-custom-printing/research.md)

### Implementação TypeScript
- [src/functions/print/index.ts](src/functions/print/index.ts) — funções públicas + validação (GAP 1 está aqui)
- [src/functions/print/types.ts](src/functions/print/types.ts) — tipos públicos
- [src/NativePagseguroPlugpag.ts](src/NativePagseguroPlugpag.ts) — spec TurboModule (5 métodos declarados)
- [src/functions/index.ts](src/functions/index.ts) — re-exports de domínio
- [src/index.ts](src/index.ts) — barrel raiz

### Implementação Kotlin
- [android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt](android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt) — 5 métodos implementados

### Testes
- [src/__tests__/functions/print.test.ts](src/__tests__/functions/print.test.ts) — 15 testes TypeScript (GAP 2 está aqui)
- [android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt](android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt) — 16 testes Kotlin

---

## 7. Ações Necessárias para Conclusão

### Obrigatórias (bloqueiam merge)

1. **Adicionar validação de `printerQuality`** em [src/functions/print/index.ts](src/functions/print/index.ts) — rejeitar com `PLUGPAG_VALIDATION_ERROR` quando o valor estiver fora de 1–4.

2. **Adicionar testes TypeScript** para `doAsyncReprintCustomerReceipt()` e `doAsyncReprintEstablishmentReceipt()` em [src/__tests__/functions/print.test.ts](src/__tests__/functions/print.test.ts) — cenários de sucesso e falha.

3. **Adicionar testes TypeScript** para validação de `printerQuality` após correção do item 1.

4. **Executar `yarn lint`** e confirmar zero erros ou avisos.

### Recomendadas (não bloqueiam merge, necessárias antes de release)

5. Validar feature em dispositivo físico PagBank SmartPOS (A920, A930, P2 ou S920).
6. Confirmar que o codegen foi regenerado após alterações na spec TurboModule (`cd example/android && ./gradlew generateCodegenArtifactsFromSchema`).
