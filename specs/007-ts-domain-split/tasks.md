# Tasks: Refatoração JS/TS — Clean Code & Separação de Domínios

**Input**: Design documents from `specs/007-ts-domain-split/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: TDD é **obrigatório** pela Constituição v1.3.0 (Princípio III). Testes DEVEM ser escritos e confirmados como falhando **antes** de qualquer implementação.

**Organization**: Tasks agrupadas por user story. US1 e US2 são ambas P1 e interligadas — US1 entrega o padrão de isolamento via domínio `activation`; US2 entrega a compatibilidade de API via domínios restantes + barrel raiz.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode ser executada em paralelo (arquivos diferentes, sem dependências de tarefas incompletas)
- **[Story]**: User story primária da tarefa ([US1]–[US5])
- Paths são absolutos a partir da raiz do repositório

---

## Phase 1: Setup (Scaffold)

**Purpose**: Criar estrutura de pastas e arquivos stub **sem alterar `src/index.tsx`**. Nenhuma lógica nesta fase.

- [X] T001 Criar diretórios `src/functions/`, `src/hooks/`, `src/types/` e `src/__tests__/functions/`, `src/__tests__/hooks/`
- [X] T002 [P] Criar arquivos stub vazios: `src/functions/activation/types.ts`, `src/functions/activation/index.ts`
- [X] T003 [P] Criar arquivos stub vazios: `src/functions/payment/types.ts`, `src/functions/payment/index.ts`
- [X] T004 [P] Criar arquivos stub vazios: `src/functions/refund/types.ts`, `src/functions/refund/index.ts`
- [X] T005 [P] Criar arquivos stub vazios: `src/functions/print/types.ts`, `src/functions/print/index.ts`
- [X] T006 [P] Criar arquivo stub vazio `src/functions/index.ts` com comentário placeholder
- [X] T007 [P] Criar arquivo stub vazio `src/hooks/usePaymentProgress.ts`

**Checkpoint**: Estrutura de pastas criada. `src/index.tsx` e `src/printing.ts` inalterados. `yarn test` deve continuar passando.

---

## Phase 2: Foundational (Shared Types)

**Purpose**: `PlugPagTransactionResult` é retornado por `doPayment` e `doRefund` — tipo compartilhado entre dois domínios. Deve ser criado **antes** dos domínios `payment` e `refund` (research.md §R5).

**⚠️ CRÍTICO**: As fases de domínio `payment` e `refund` dependem desta fase.

- [X] T008 Criar `src/types/sharedTypes.ts` com `export interface PlugPagTransactionResult` contendo todos os 18 campos copiados de `src/index.tsx` linhas 62–81
- [X] T009 Executar `yarn typecheck` — confirmar que `src/types/sharedTypes.ts` compila sem erros

**Checkpoint**: `PlugPagTransactionResult` disponível em `src/types/sharedTypes.ts`. Pronto para domínios `payment` e `refund`.

---

## Phase 3: User Story 1 — Domínio Activation (Priority: P1) 🎯 Proof of Pattern

**Goal**: Primeiro domínio isolado. Prova que o padrão de isolamento funciona: `functions/activation/` é auto-contido, sem dependências cruzadas, com guard Nível 2 e `getNativeModule()` lazy no path correto.

**Independent Test**: Após esta fase, adicionar um arquivo vazio `src/functions/nfc/index.ts` e um `export * from './nfc'` em `functions/index.ts` não requer alterar activation, payment, refund ou print.

### Testes — Domain Activation (TDD: escrever primeiro, confirmar red)

- [X] T010 [US1] Criar `src/__tests__/functions/activation.test.ts` com mock de `'../../NativePagseguroPlugpag'` e cenários: (1) iOS rejeita com prefixo `[react-native-pagseguro-plugpag] ERROR: initializeAndActivatePinPad()`, (2) iOS rejeita com prefixo para `doAsyncInitializeAndActivatePinPad()`, (3) Android resolve com `{ result: 'ok' }`, (4) Android rejeita com `PLUGPAG_ACTIVATION_ERROR`
- [X] T011 [US1] Executar `yarn test -- --testPathPattern=activation` — confirmar que todos os testes **falham** (red) antes da implementação

### Implementação — Domain Activation

- [X] T012 [P] [US1] Definir `export interface PlugPagActivationSuccess { result: 'ok' }` em `src/functions/activation/types.ts`
- [X] T013 [US1] Implementar `getNativeModule()` (lazy, privado), `initializeAndActivatePinPad` com guard Nível 2 (`Platform.OS !== 'android'` → throw) e `getNativeModule()` após o guard em `src/functions/activation/index.ts` — path do require: `'../../NativePagseguroPlugpag'` (research.md §R1, §R3)
- [X] T014 [US1] Implementar `doAsyncInitializeAndActivatePinPad` com guard Nível 2 e `getNativeModule()` em `src/functions/activation/index.ts`
- [X] T015 [US1] Adicionar exports em `src/functions/activation/index.ts`: `export type { PlugPagActivationSuccess } from './types'` e re-export das funções
- [X] T016 [US1] Adicionar `export * from './activation'` em `src/functions/index.ts`
- [X] T017 [US1] Executar `yarn lint && yarn typecheck && yarn test -- --testPathPattern=activation` — confirmar zero erros e testes passando (green)

**Checkpoint**: Domínio `activation` isolado e funcionando. Padrão `getNativeModule()` + guard Nível 2 estabelecido. US1 parcialmente entregue (padrão provado).

---

## Phase 4: User Story 2 — Domínio Payment (Priority: P1)

**Goal**: Domínio mais complexo — inclui `getEmitter` singleton (privado), `validatePaymentRequest` (privada), `NativeEventEmitter` e `subscribeToPaymentProgress`. Exportação de `const` objects com `export {}` vs `export type {}` (research.md §R2).

**Independent Test**: `doPayment`, `doAsyncPayment` e `subscribeToPaymentProgress` importados diretamente de `functions/payment/index` funcionam corretamente; iOS guard lança antes de qualquer chamada nativa.

### Testes — Domain Payment (TDD: escrever primeiro, confirmar red)

- [X] T018 [US2] Criar `src/__tests__/functions/payment.test.ts` com mock de `'../../NativePagseguroPlugpag'`, cobrindo: (1) iOS guard para `doPayment`, `doAsyncPayment`, `subscribeToPaymentProgress`, (2) validação de `amount <= 0`, `installments < 1`, parcelamento + tipo incompatível, `userReference > 10 chars`, PIX/DEBIT com parcelas, (3) Android + sucesso com `PlugPagTransactionResult`, (4) Android + `PLUGPAG_PAYMENT_ERROR`, (5) `subscribeToPaymentProgress` retorna função de unsubscribe
- [X] T019 [US2] Executar `yarn test -- --testPathPattern=payment` — confirmar que todos os testes **falham** (red)

### Implementação — Domain Payment

- [X] T020 [P] [US2] Definir em `src/functions/payment/types.ts`: `PaymentType` (const as const), `PlugPagPaymentType` (derived type), `InstallmentType` (const as const), `PlugPagInstallmentType` (derived type), `PlugPagPaymentRequest` (interface), `PlugPagPaymentProgressEvent` (interface)
- [X] T021 [US2] Implementar `getNativeModule()` privado e `getEmitter()` singleton privado (com cast `any` documentado — research.md §R8) em `src/functions/payment/index.ts`; adicionar imports: `Platform`, `NativeEventEmitter`, `NativeModules` (Group 1); `import type { Spec }` (Group 4)
- [X] T022 [US2] Implementar `validatePaymentRequest(data: PlugPagPaymentRequest): void` privado com as 5 regras de validação em `src/functions/payment/index.ts`
- [X] T023 [US2] Implementar `doPayment` com guard Nível 2 → `validatePaymentRequest` → `getNativeModule()` em `src/functions/payment/index.ts`; import `PlugPagTransactionResult` de `'../../types/sharedTypes'`
- [X] T024 [US2] Implementar `doAsyncPayment` com guard Nível 2 → `validatePaymentRequest` → `getNativeModule()` em `src/functions/payment/index.ts`
- [X] T025 [US2] Implementar `subscribeToPaymentProgress` em `src/functions/payment/index.ts`
- [X] T026 [US2] Adicionar exports em `src/functions/payment/index.ts`: `export { PaymentType, InstallmentType }` (valores — **não** `export type`); `export type { PlugPagPaymentType, PlugPagInstallmentType, PlugPagPaymentRequest, PlugPagPaymentProgressEvent }` (tipos puros) — ver research.md §R2
- [X] T027 [US2] Adicionar `export * from './payment'` em `src/functions/index.ts`
- [X] T028 [US2] Executar `yarn lint && yarn typecheck && yarn test -- --testPathPattern=payment` — confirmar zero erros e testes passando (green)

**Checkpoint**: Domínio `payment` isolado. `getEmitter` privado no domínio correto. `PlugPagTransactionResult` importado de `types/sharedTypes`.

---

## Phase 5: User Story 2 — Domínio Refund (Priority: P1)

**Goal**: Domínio de estorno isolado com validação de `transactionCode`, `transactionId` e `voidType`. Retorna `PlugPagTransactionResult` de `types/sharedTypes`.

**Independent Test**: `doRefund` importado diretamente de `functions/refund/index` funciona; iOS guard lança antes do nativo; validação de campos vazios funciona.

### Testes — Domain Refund (TDD: escrever primeiro, confirmar red)

- [X] T029 [US2] Criar `src/__tests__/functions/refund.test.ts` com mock de `'../../NativePagseguroPlugpag'`, cobrindo: (1) iOS guard para `doRefund`, (2) validação de `transactionCode` vazio, `transactionId` vazio, `voidType` inválido, (3) Android + sucesso com `PlugPagTransactionResult`, (4) Android + `PLUGPAG_REFUND_ERROR`
- [X] T030 [US2] Executar `yarn test -- --testPathPattern=refund` — confirmar que todos os testes **falham** (red)

### Implementação — Domain Refund

- [X] T031 [P] [US2] Definir em `src/functions/refund/types.ts`: `PlugPagVoidType` (const as const), `PlugPagVoidTypeValue` (derived type), `PlugPagRefundRequest` (interface com `transactionCode`, `transactionId`, `voidType: PlugPagVoidTypeValue`, `printReceipt?: boolean`)
- [X] T032 [US2] Implementar `getNativeModule()` privado em `src/functions/refund/index.ts`; `import type { Spec }` (Group 4); `import { Platform }` (Group 1); `import type { PlugPagTransactionResult } from '../../types/sharedTypes'` (Group 4)
- [X] T033 [US2] Implementar `validateRefundRequest(data: PlugPagRefundRequest): void` privado com as 3 regras de validação em `src/functions/refund/index.ts`
- [X] T034 [US2] Implementar `doRefund` com guard Nível 2 → `validateRefundRequest` → `getNativeModule()` em `src/functions/refund/index.ts`
- [X] T035 [US2] Adicionar exports em `src/functions/refund/index.ts`: `export { PlugPagVoidType }` (valor); `export type { PlugPagVoidTypeValue, PlugPagRefundRequest }` (tipos)
- [X] T036 [US2] Adicionar `export * from './refund'` em `src/functions/index.ts`
- [X] T037 [US2] Executar `yarn lint && yarn typecheck && yarn test -- --testPathPattern=refund` — confirmar zero erros e testes passando (green)

**Checkpoint**: Domínio `refund` isolado. Nenhum import cruzado entre `payment` e `refund`.

---

## Phase 6: User Story 2 — Domínio Print (Priority: P1)

**Goal**: Substitui `src/printing.ts`. Aplica breaking change intencional: `PrintRequest.printerQuality?: number` → `PrintRequest.printerQuality?: PrintQualityValue`. Remove validação de range em runtime (coberta por compile time). Remove `src/printing.ts` ao final.

**Independent Test**: `printFromFile` com `printerQuality: 99` falha em compile time (type error); com `printerQuality: PrintQuality.HIGH` compila e funciona.

### Testes — Domain Print (TDD: escrever primeiro, confirmar red)

- [X] T038 [US2] Criar `src/__tests__/functions/print.test.ts` com mock de `'../../NativePagseguroPlugpag'`, cobrindo: (1) iOS guard para `printFromFile`, `reprintCustomerReceipt`, `doAsyncReprintCustomerReceipt`, `reprintEstablishmentReceipt`, `doAsyncReprintEstablishmentReceipt`, (2) validação de `filePath` vazio, `steps < 0`, (3) Android + sucesso com `PrintResult`, (4) Android + `PLUGPAG_PRINT_ERROR`
- [X] T039 [US2] Executar `yarn test -- --testPathPattern=print` — confirmar que todos os testes **falham** (red)

### Implementação — Domain Print

- [X] T040 [P] [US2] Criar `src/functions/print/types.ts` com conteúdo migrado de `src/printing.ts`: `PrintQuality` (const as const), `PrintQualityValue` (derived type), `MIN_PRINTER_STEPS = 70`, `PrintResult` (interface). Alterar `PrintRequest.printerQuality?: number` para `PrintRequest.printerQuality?: PrintQualityValue` (breaking change intencional — research.md §R4)
- [X] T041 [US2] Implementar `getNativeModule()` privado e `import type { Spec }`, `import { Platform }`, `import type { PrintRequest, PrintResult }` em `src/functions/print/index.ts`
- [X] T042 [US2] Implementar `validatePrintRequest(data: PrintRequest): void` privado **sem** o check `printerQuality < 1 || printerQuality > 4` (removido — coberto por compile time); manter checks de `filePath` e `steps` em `src/functions/print/index.ts`
- [X] T043 [US2] Implementar `printFromFile` com guard Nível 2 → `validatePrintRequest` → `getNativeModule()` em `src/functions/print/index.ts`
- [X] T044 [US2] Implementar `reprintCustomerReceipt` e `doAsyncReprintCustomerReceipt` com guard Nível 2 + `getNativeModule()` em `src/functions/print/index.ts`
- [X] T045 [US2] Implementar `reprintEstablishmentReceipt` e `doAsyncReprintEstablishmentReceipt` com guard Nível 2 + `getNativeModule()` em `src/functions/print/index.ts`
- [X] T046 [US2] Adicionar exports em `src/functions/print/index.ts`: `export { PrintQuality, MIN_PRINTER_STEPS }` (valores); `export type { PrintQualityValue, PrintRequest, PrintResult }` (tipos)
- [X] T047 [US2] Adicionar `export * from './print'` em `src/functions/index.ts` (verificar ordem alfabética: activation, payment, print, refund)
- [X] T048 [US2] Deletar `src/printing.ts` — domínio `print` agora vive exclusivamente em `src/functions/print/`
- [X] T049 [US2] Executar `yarn lint && yarn typecheck && yarn test -- --testPathPattern=print` — confirmar zero erros e testes passando (green)

**Checkpoint**: Todos os 4 domínios isolados. `src/printing.ts` removido. `src/functions/index.ts` agrega os 4 domínios.

---

## Phase 7: User Story 2 — Hook + Barrel Raiz (Priority: P1)

**Goal**: Mover `usePaymentProgress` para `src/hooks/`. Criar `src/index.ts` (barrel raiz com iOS Nível 1 + re-exports). Substituir `src/index.tsx` pelo novo `src/index.ts`. Completar compatibilidade de API pública.

**Independent Test**: Importar `doPayment`, `PaymentType`, `PrintQuality`, `doRefund`, `usePaymentProgress` de `'react-native-pagseguro-plugpag'` compila sem erros; comportamento idêntico ao anterior.

### Testes — Hook + Barrel Raiz (TDD: escrever primeiro, confirmar red)

- [X] T050 [US2] Criar `src/__tests__/hooks/usePaymentProgress.test.ts` com cobertura de: (1) callback é chamado quando evento `onPaymentProgress` é emitido, (2) subscription é removida ao desmontar o componente, (3) referência ao callback é atualizada sem re-subscribing
- [X] T051 [US2] Criar `src/__tests__/index.test.ts` com único cenário: importar o módulo em iOS emite `console.warn` com prefixo `[react-native-pagseguro-plugpag] WARNING:` e não lança erro
- [X] T052 [US2] Executar `yarn test -- --testPathPattern="hooks|__tests__/index"` — confirmar que os novos testes **falham** (red)

### Implementação — Hook + Barrel Raiz

- [X] T053 [US2] Implementar `src/hooks/usePaymentProgress.ts`: imports em ordem (Group 1: `useEffect`, `useRef` de `'react'`; Group 2: `subscribeToPaymentProgress` de `'../functions/payment/index'`; Group 4: `import type { PlugPagPaymentProgressEvent }` de `'../functions/payment/types'`); função exportada `usePaymentProgress(callback)` usando `useRef` + `useEffect` + `subscribeToPaymentProgress`
- [X] T054 [US2] Criar `src/index.ts` (novo arquivo): (1) iOS Nível 1 guard (`Platform.OS !== 'android'` → `console.warn`); (2) `export * from './functions'`; (3) `export * from './hooks/usePaymentProgress'`; (4) `export type { PlugPagTransactionResult } from './types/sharedTypes'`
- [X] T055 [US2] Executar `yarn lint && yarn typecheck && yarn test -- --testPathPattern="hooks|__tests__/index"` — confirmar testes passando (green)
- [X] T056 [US2] Deletar `src/index.tsx` — substituído por `src/index.ts`
- [X] T057 [US2] Executar suite completa: `yarn lint && yarn typecheck && yarn test` — confirmar **zero** erros, **zero** avisos, **todos** os testes passando

**Checkpoint**: API pública 100% compatível. `src/index.tsx` e `src/printing.ts` removidos. US1 e US2 entregues.

---

## Phase 8: User Story 3 — Validação Testável Diretamente (Priority: P2)

**Goal**: Garantir que os arquivos de teste dos domínios cobrem os cenários de validação com granularidade suficiente para que um contribuidor possa identificar a regra violada sem executar a função principal.

**Independent Test**: Os arquivos `payment.test.ts`, `refund.test.ts` e `print.test.ts` possuem blocos `describe` dedicados à validação (ex: `describe('validatePaymentRequest')`), com um `it` por regra.

> **Nota**: Nenhum arquivo de implementação muda nesta fase — apenas os arquivos de teste recebem organização adicional se necessário.

- [X] T058 [P] [US3] Verificar que `src/__tests__/functions/payment.test.ts` contém `describe('validatePaymentRequest')` com testes individuais para cada uma das 5 regras (amount, installments, parcelamento/tipo, PIX/DEBIT, userReference). Se ausente, adicionar os casos faltantes.
- [X] T059 [P] [US3] Verificar que `src/__tests__/functions/refund.test.ts` contém `describe('validateRefundRequest')` com testes para transactionCode vazio, transactionId vazio e voidType inválido. Se ausente, adicionar.
- [X] T060 [P] [US3] Verificar que `src/__tests__/functions/print.test.ts` contém `describe('validatePrintRequest')` com testes para filePath vazio e steps < 0. Confirmar ausência de teste para `printerQuality` fora do range (coberto por compile time, não runtime). Se ausente, adicionar.
- [X] T061 [US3] Executar `yarn test -- --testPathPattern=functions` — confirmar 100% passing com cobertura de validação granular

**Checkpoint**: US3 entregue. Cada regra de validação tem teste dedicado, identificável sem executar a função principal.

---

## Phase 9: User Story 4 — iOS Guard por Função (Priority: P2)

**Goal**: Confirmar que o guard Nível 2 está presente em **todas** as funções exportadas de todos os domínios, e que o módulo nativo **nunca** é acessado antes do guard.

**Independent Test**: Importar `doPayment` diretamente de `src/functions/payment/index` (não via barrel) em ambiente iOS e chamar a função — deve lançar o erro com prefixo correto.

> **Nota**: Esta fase é de auditoria — nenhum arquivo novo é criado se a implementação foi feita corretamente nas fases anteriores.

- [X] T062 [P] [US4] Auditar `src/functions/activation/index.ts`: confirmar guard Nível 2 presente em `initializeAndActivatePinPad` e `doAsyncInitializeAndActivatePinPad` **antes** de `getNativeModule()`
- [X] T063 [P] [US4] Auditar `src/functions/payment/index.ts`: confirmar guard Nível 2 presente em `doPayment`, `doAsyncPayment`, `subscribeToPaymentProgress` **antes** de `getNativeModule()` ou `getEmitter()`
- [X] T064 [P] [US4] Auditar `src/functions/refund/index.ts`: confirmar guard Nível 2 presente em `doRefund` **antes** de `getNativeModule()`
- [X] T065 [P] [US4] Auditar `src/functions/print/index.ts`: confirmar guard Nível 2 presente em todas as 5 funções (`printFromFile`, `reprintCustomerReceipt`, `doAsyncReprintCustomerReceipt`, `reprintEstablishmentReceipt`, `doAsyncReprintEstablishmentReceipt`) **antes** de `getNativeModule()`
- [X] T066 [US4] Verificar que `src/__tests__/functions/payment.test.ts`, `activation.test.ts`, `refund.test.ts` e `print.test.ts` contêm cenário de iOS guard (rejeita com prefixo `ERROR:`) para cada função exportada. Se ausente em alguma função, adicionar.
- [X] T067 [US4] Executar `yarn test` — confirmar 100% passing com cobertura de iOS guard em todas as funções exportadas

**Checkpoint**: US4 entregue. Nenhuma função exportada acessa o módulo nativo sem guard Nível 2 precedente.

---

## Phase 10: User Story 5 — Constituição Atualizada (Priority: P3)

**Goal**: Garantir que `CLAUDE.md` está sincronizado com a nova estrutura de pastas, paths do `require`, extensão `index.ts` e regras de import.

**Independent Test**: Um contribuidor que lê apenas `CLAUDE.md` consegue implementar um novo domínio corretamente sem precisar consultar o código existente.

- [X] T068 [P] [US5] Verificar `CLAUDE.md` seção "Estrutura de Arquivos Críticos" — confirmar que reflete a estrutura `functions/`, `hooks/`, `types/` atual (sem menção a `index.tsx` ou `printing.ts`)
- [X] T069 [P] [US5] Verificar `CLAUDE.md` seção "Padrões de Código TypeScript" — confirmar que o path do `require` está documentado como `'../../NativePagseguroPlugpag'` e que a função `getNativeModule()` está exemplificada
- [X] T070 [US5] Verificar `CLAUDE.md` seção "Padrão de Testes JS" — confirmar que o mock path de exemplo usa `'../../NativePagseguroPlugpag'` para testes em `__tests__/functions/`
- [X] T071 [US5] Atualizar `CLAUDE.md` seção "Status das Features" para incluir entry de feature/007 como completa

**Checkpoint**: US5 entregue. Constituição consistente com implementação.

---

## Phase 11: Polish & Validação Final

**Purpose**: Validação cruzada completa e limpeza de resíduos.

- [X] T072 Executar `yarn lint && yarn typecheck && yarn test` — confirmar zero erros, zero avisos, **todos** os testes passando na suite completa
- [X] T073 [P] Verificar que `src/index.tsx` não existe mais no repositório
- [X] T074 [P] Verificar que `src/printing.ts` não existe mais no repositório
- [X] T075 [P] Verificar que `src/types/sharedTypes.ts` existe e é importado por `payment` e `refund`
- [X] T076 Executar `yarn example android` (build de verificação) — confirmar que o build compila sem erros; API pública acessível via `example/src/App.tsx`

**Checkpoint Final**: Zero arquivos mortos. Suite completa verde. Build de exemplo passa. Feature/007 completa.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sem dependências — pode iniciar imediatamente
- **Phase 2 (Foundational)**: Depende de Phase 1 — bloqueia phases 4 e 5 (payment e refund usam `PlugPagTransactionResult`)
- **Phase 3 (US1 - activation)**: Depende de Phase 1 apenas — pode iniciar em paralelo com Phase 2
- **Phase 4 (US2 - payment)**: Depende de Phase 2 (precisa de `PlugPagTransactionResult`) e Phase 3 (padrão estabelecido)
- **Phase 5 (US2 - refund)**: Depende de Phase 2. Pode rodar em paralelo com Phase 4 (arquivos diferentes)
- **Phase 6 (US2 - print)**: Depende de Phase 1 apenas. Pode rodar em paralelo com Phases 4 e 5
- **Phase 7 (US2 - hook + barrel)**: Depende de Phases 3, 4, 5, 6 (barrel agrega todos os domínios)
- **Phase 8 (US3)**: Depende de Phases 3–6 (audita os test files criados nessas phases)
- **Phase 9 (US4)**: Depende de Phases 3–6 (audita implementações criadas nessas phases)
- **Phase 10 (US5)**: Pode iniciar em qualquer momento após Phase 7
- **Phase 11 (Polish)**: Depende de todas as phases anteriores

### User Story Dependencies

- **US1 (P1)**: Depende de Phases 1–3. Entregue após T017.
- **US2 (P1)**: Depende de US1 + Phases 4–7. Entregue após T057.
- **US3 (P2)**: Depende de US1 + US2 (Phases 3–6). Entregue após T061.
- **US4 (P2)**: Depende de US1 + US2 (Phases 3–6). Entregue após T067.
- **US5 (P3)**: Depende de US2 (estrutura final deve estar implementada). Entregue após T071.

### Within Each Domain Phase

1. Escrever testes (red) → **confirmar falha** → implementar types.ts → implementar index.ts → adicionar ao barrel → validar (green)
2. Nunca avançar para o próximo domínio sem `yarn test` passando no domínio atual

### Parallel Opportunities

- Phases 2 e 3 podem rodar em paralelo (arquivos completamente distintos)
- Phases 4, 5 e 6 podem rodar em paralelo entre si (após Phase 2)
- Tasks marcadas [P] dentro de cada phase podem ser executadas simultaneamente
- Phases 8 e 9 podem rodar em paralelo entre si

---

## Parallel Example: Phases 4, 5 e 6

```
Após Phase 2 (Foundational) estar completa:

Paralelo A — Domain Payment (T018–T028):
  T020 payment/types.ts
  T021 getEmitter + getNativeModule
  T022 validatePaymentRequest
  T023 doPayment
  ...

Paralelo B — Domain Refund (T029–T037):
  T031 refund/types.ts
  T032 getNativeModule + imports
  T033 validateRefundRequest
  T034 doRefund
  ...

Paralelo C — Domain Print (T038–T049):
  T040 print/types.ts (com breaking change)
  T041 getNativeModule + imports
  T042 validatePrintRequest (sem range check)
  T043 printFromFile
  ...
```

---

## Implementation Strategy

### MVP First (US1 — Proof of Pattern)

1. Phase 1: Setup
2. Phase 3: US1 — Domain Activation (prova o padrão)
3. **STOP e VALIDAR**: Padrão `getNativeModule()` + guard + barrel funciona
4. Confirmar: adicionar pasta `functions/nfc/` vazia não quebra nada

### Incremental Delivery

1. Phase 1 + 2 → Scaffold + sharedTypes prontos
2. Phase 3 (activation) → US1 ✅ Padrão estabelecido
3. Phases 4–6 (payment, refund, print) → US2 progressivamente entregue
4. Phase 7 (hook + barrel) → US2 ✅ API pública completa
5. Phases 8–9 → US3 ✅ + US4 ✅ Qualidade confirmada
6. Phase 10 → US5 ✅ Documentação
7. Phase 11 → Polish ✅

### Estratégia de Rollback

Se uma etapa falhar em `yarn typecheck`:
1. Não avançar para o próximo domínio
2. Verificar path do `require` (research.md §R3)
3. Verificar export de `const` objects (research.md §R2)
4. Verificar guard Nível 2 antes de `getNativeModule()` (research.md §R1)

---

## Notes

- [P] = arquivos diferentes, sem dependências de tasks incompletas
- [USN] = user story primária da task
- TDD obrigatório (Constituição Princípio III): testes DEVEM falhar antes da implementação
- Executar `yarn lint` após cada phase — nenhum PR pode ser aberto com falhas de lint
- `src/index.tsx` e `src/printing.ts` são removidos **somente** nas Phases 7 e 6 respectivamente — não antes
- `const` objects (`PaymentType`, `InstallmentType`, `PlugPagVoidType`, `PrintQuality`) NUNCA com `export type` — ver research.md §R2
- Path do require em `functions/<domain>/index.ts` é sempre `'../../NativePagseguroPlugpag'` — ver research.md §R3
