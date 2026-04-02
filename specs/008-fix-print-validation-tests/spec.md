# Feature Specification: Fix Print Validation & Complete Test Coverage

**Feature Branch**: `bugfix/008-fix-print-validation-tests`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: Correção dos gaps críticos da Feature 006 (Custom Printing): validação ausente de `printerQuality` e cobertura de testes TypeScript incompleta para funções assíncronas de reimpressão.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Validação de printerQuality inválido (Priority: P1)

Um desenvolvedor que consome a biblioteca chama `printFromFile()` passando um valor numérico fora do intervalo permitido para `printerQuality` (ex: `99`, `-1`, `0`, `5`). A biblioteca deve rejeitar imediatamente a chamada com um erro de validação claro, antes de qualquer chamada ao SDK nativo.

**Why this priority**: Sem essa validação, valores inválidos chegam ao SDK PagBank com comportamento imprevisível — o bug existe em produção hoje e nenhuma salvaguarda impede chamadas incorretas.

**Independent Test**: Pode ser testado unitariamente chamando `printFromFile()` com `printerQuality` fora de 1–4 e verificando que a Promise rejeita com a mensagem `PLUGPAG_VALIDATION_ERROR` antes de qualquer interação com o módulo nativo mockado.

**Acceptance Scenarios**:

1. **Given** um `PrintRequest` com `printerQuality: 99`, **When** `printFromFile()` é chamado em Android, **Then** a Promise rejeita com `Error` contendo `PLUGPAG_VALIDATION_ERROR` e a mensagem descreve que `printerQuality` deve estar entre 1 e 4.
2. **Given** um `PrintRequest` com `printerQuality: 0`, **When** `printFromFile()` é chamado em Android, **Then** a Promise rejeita com `PLUGPAG_VALIDATION_ERROR`.
3. **Given** um `PrintRequest` com `printerQuality: 5`, **When** `printFromFile()` é chamado em Android, **Then** a Promise rejeita com `PLUGPAG_VALIDATION_ERROR`.
4. **Given** um `PrintRequest` com `printerQuality: -1`, **When** `printFromFile()` é chamado em Android, **Then** a Promise rejeita com `PLUGPAG_VALIDATION_ERROR`.
5. **Given** um `PrintRequest` com `printerQuality` undefined (campo omitido), **When** `printFromFile()` é chamado em Android, **Then** a Promise **resolve** normalmente (campo é opcional).
6. **Given** um `PrintRequest` com `printerQuality: 1`, **When** `printFromFile()` é chamado em Android, **Then** a Promise **resolve** normalmente (valor mínimo válido).
7. **Given** um `PrintRequest` com `printerQuality: 4`, **When** `printFromFile()` é chamado em Android, **Then** a Promise **resolve** normalmente (valor máximo válido).

---

### User Story 2 — Cobertura de testes para doAsyncReprintCustomerReceipt (Priority: P2)

Um desenvolvedor que contribui à biblioteca precisa ter garantia de que `doAsyncReprintCustomerReceipt()` — função exportada publicamente — se comporta corretamente tanto no caminho feliz quanto em falha do SDK. Hoje a função existe e está em uso, mas nenhum teste TypeScript a cobre.

**Why this priority**: A Constituição exige 100% de cobertura de todas as funções exportadas. A ausência de testes impede merge da Feature 006 e cria risco de regressão silenciosa.

**Independent Test**: Pode ser testado adicionando cenários em `print.test.ts` para `doAsyncReprintCustomerReceipt()` sem alterar nenhum outro arquivo — entrega valor imediato de conformidade com a Constituição.

**Acceptance Scenarios**:

1. **Given** ambiente Android e o módulo nativo mockado para resolver com sucesso, **When** `doAsyncReprintCustomerReceipt()` é chamado, **Then** a Promise resolve com um objeto `PrintResult` válido (`{ result: 'ok', steps: number }`).
2. **Given** ambiente Android e o módulo nativo mockado para rejeitar com `PLUGPAG_PRINT_ERROR`, **When** `doAsyncReprintCustomerReceipt()` é chamado, **Then** a Promise rejeita com erro contendo `PLUGPAG_PRINT_ERROR`.
3. **Given** ambiente iOS, **When** `doAsyncReprintCustomerReceipt()` é chamado, **Then** a Promise rejeita com `Error` contendo o prefixo `[react-native-pagseguro-plugpag] ERROR:`.

---

### User Story 3 — Cobertura de testes para doAsyncReprintEstablishmentReceipt (Priority: P3)

Mesma necessidade da User Story 2, mas para `doAsyncReprintEstablishmentReceipt()`.

**Why this priority**: Mesmo risco e mesma exigência constitucional. Prioridade ligeiramente menor que a US2 por ser a segunda das duas funções sem cobertura — ambas devem ser resolvidas no mesmo bugfix.

**Independent Test**: Mesma abordagem da US2 — cenários adicionais em `print.test.ts` para `doAsyncReprintEstablishmentReceipt()`.

**Acceptance Scenarios**:

1. **Given** ambiente Android e o módulo nativo mockado para resolver com sucesso, **When** `doAsyncReprintEstablishmentReceipt()` é chamado, **Then** a Promise resolve com um objeto `PrintResult` válido.
2. **Given** ambiente Android e o módulo nativo mockado para rejeitar com `PLUGPAG_PRINT_ERROR`, **When** `doAsyncReprintEstablishmentReceipt()` é chamado, **Then** a Promise rejeita com erro contendo `PLUGPAG_PRINT_ERROR`.
3. **Given** ambiente iOS, **When** `doAsyncReprintEstablishmentReceipt()` é chamado, **Then** a Promise rejeita com `Error` contendo o prefixo `[react-native-pagseguro-plugpag] ERROR:`.

---

### Edge Cases

- O que acontece quando `printerQuality` é `undefined`? → Campo é opcional; deve ser aceito sem erro.
- O que acontece quando `printerQuality` é exatamente `1` (mínimo) ou `4` (máximo)? → Ambos são válidos e devem passar sem erro.
- O que acontece quando `printerQuality` é um número fracionário como `1.5`? → Tecnicamente fora dos valores válidos do `PrintQuality` enum. O tipo TypeScript `PrintQualityValue` aceita somente `1 | 2 | 3 | 4` em tempo de compilação, mas a validação em runtime deve rejeitar qualquer valor fora de 1–4 (inclusive fracionários).
- O que acontece quando `printerQuality` é `NaN`? → Deve ser rejeitado — a comparação `< 1 || > 4` captura `NaN` corretamente em JavaScript (ambos retornam `true` com `NaN`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A função `printFromFile()` DEVE rejeitar com `PLUGPAG_VALIDATION_ERROR` quando `printerQuality` for fornecido e estiver fora do intervalo [1, 4] (inclusive).
- **FR-002**: A validação de `printerQuality` DEVE ocorrer antes de qualquer chamada ao módulo nativo — a rejeição é imediata, sem tráfego ao SDK.
- **FR-003**: A validação de `printerQuality` DEVE ser transparente para valores `undefined` (campo omitido) — não deve alterar o comportamento atual para chamadas sem esse campo.
- **FR-004**: A mensagem de erro de `printerQuality` inválido DEVE conter o prefixo `[react-native-pagseguro-plugpag] PLUGPAG_VALIDATION_ERROR:` e indicar que o valor deve estar entre 1 e 4.
- **FR-005**: Os testes TypeScript de `doAsyncReprintCustomerReceipt()` DEVEM cobrir: sucesso em Android, falha com `PLUGPAG_PRINT_ERROR` em Android, e rejeição em iOS.
- **FR-006**: Os testes TypeScript de `doAsyncReprintEstablishmentReceipt()` DEVEM cobrir: sucesso em Android, falha com `PLUGPAG_PRINT_ERROR` em Android, e rejeição em iOS.
- **FR-007**: Os testes TypeScript da validação de `printerQuality` DEVEM cobrir: valores fora do intervalo (ex: `99`, `0`, `-1`), valores no limite válido (`1`, `4`), e campo omitido (`undefined`).
- **FR-008**: Após as correções, `yarn test` DEVE passar com zero falhas e `yarn lint` DEVE passar sem erros ou avisos.

### Key Entities

- **PrintRequest**: Objeto de entrada de `printFromFile()` — campos: `filePath` (string obrigatório), `printerQuality` (1|2|3|4, opcional), `steps` (number >= 0, opcional).
- **PrintQuality**: Const object enumerando os valores válidos: `LOW=1`, `MEDIUM=2`, `HIGH=3`, `MAX=4`.
- **PrintResult**: Objeto de retorno de todas as funções de impressão — campos: `result: 'ok'`, `steps: number`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Toda chamada a `printFromFile()` com `printerQuality` fora de 1–4 é rejeitada com `PLUGPAG_VALIDATION_ERROR` antes de interagir com o hardware — sem comportamento imprevisível no SDK.
- **SC-002**: O arquivo `print.test.ts` passa de 15 para pelo menos 22 cenários de teste, cobrindo 100% das 5 funções exportadas do domínio de impressão.
- **SC-003**: Nenhum teste existente passa a falhar como resultado desta correção.
- **SC-004**: `yarn lint` e `yarn test` executam com zero erros ou avisos após as alterações.
- **SC-005**: A validação de `printerQuality` é não-regressiva: chamadas com `printerQuality` válido ou omitido continuam funcionando exatamente como antes.

## Assumptions

- A validação de `printerQuality` será adicionada à função `validatePrintRequest()` existente em `src/functions/print/index.ts`, sem criar nova função.
- Os novos testes seguem o padrão estabelecido em `print.test.ts` — mesmo mock do módulo nativo, mesma estrutura `describe/it`.
- A validação de `NaN` não requer tratamento especial explícito, pois as comparações `< 1` e `> 4` com `NaN` já retornam `true` em JavaScript.
- Nenhuma alteração é necessária em `NativePagseguroPlugpag.ts` (spec TurboModule) — o contrato nativo já está correto.
- Nenhuma alteração é necessária nos testes Kotlin — os 16 testes existentes já cobrem o lado nativo adequadamente.
