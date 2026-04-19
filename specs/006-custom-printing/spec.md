# Feature Specification: Custom Printing (Impressão Personalizada)

**Feature Branch**: `feature/006-custom-printing`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Feature 006: Custom Printing — Impressão personalizada via printFromFile, reprintCustomerReceipt e reprintEstablishmentReceipt nos terminais PagBank SmartPOS"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Imprimir Conteúdo Personalizado (Priority: P1)

Um desenvolvedor de aplicativo que usa terminais PagBank SmartPOS precisa imprimir recibos de loja, notas fiscais simplificadas ou etiquetas com layout totalmente personalizado — conteúdo que vai além do comprovante padrão de transação. Para isso, ele prepara uma imagem (PNG, JPEG ou BMP) com o layout desejado e solicita a impressão passando o caminho do arquivo no dispositivo.

**Why this priority**: É o único método que permite impressão de conteúdo completamente arbitrário. Sem ele, desenvolvedores não têm como imprimir nada além do comprovante padrão de transação — o problema central que esta feature resolve.

**Independent Test**: Pode ser testado de forma independente passando um caminho de arquivo de imagem válido e verificando que o terminal imprime a imagem corretamente, retornando confirmação com o número de linhas impressas.

**Acceptance Scenarios**:

1. **Given** um arquivo de imagem válido existe no dispositivo, **When** o desenvolvedor chama `printFromFile` com o caminho do arquivo, **Then** o terminal imprime a imagem e a biblioteca retorna confirmação de sucesso com o número de linhas impressas.
2. **Given** o desenvolvedor não informa a qualidade de impressão, **When** `printFromFile` é chamado, **Then** a impressão ocorre com qualidade máxima (nível 4) como padrão.
3. **Given** o desenvolvedor não informa o número de linhas em branco após a impressão, **When** `printFromFile` é chamado, **Then** a impressão usa o valor mínimo recomendado (70 linhas) como padrão.
4. **Given** o caminho do arquivo está vazio ou em branco, **When** `printFromFile` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_VALIDATION_ERROR` e mensagem descritiva, sem acionar o hardware.
5. **Given** a qualidade de impressão informada está fora do intervalo 1–4, **When** `printFromFile` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_VALIDATION_ERROR` e mensagem descritiva.
6. **Given** o número de linhas em branco é negativo, **When** `printFromFile` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_VALIDATION_ERROR` e mensagem descritiva.
7. **Given** o SDK retorna `PlugPagPrintResult.result != RET_OK` (ex.: `NO_PRINTER_DEVICE = -1040`), **When** `printFromFile` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_PRINT_ERROR`, propagando `message` e `errorCode` do `PlugPagPrintResult`.
8. **Given** o SDK lança `PlugPagException` (ex.: IPC falhou), **When** `printFromFile` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_INTERNAL_ERROR` propagando `message` e `errorCode` da exceção.
9. **Given** a biblioteca é usada em iOS, **When** `printFromFile` é chamado, **Then** a biblioteca rejeita imediatamente com mensagem explicativa sem acionar nenhum hardware.

---

### User Story 2 - Reimprimir Via do Cliente (Priority: P2)

Um operador de terminal PagBank SmartPOS precisa reimprimir o comprovante da última transação aprovada para o cliente (ex.: papel ficou preso, cliente pediu segunda via). Ele aciona a reimpressão sem precisar informar dados adicionais — a seleção da última transação é automática.

**Why this priority**: Funcionalidade de suporte operacional recorrente em pontos de venda. Reduz atrito com clientes e elimina a necessidade de cancelar e refazer transações.

**Independent Test**: Pode ser testado de forma independente após qualquer transação aprovada, verificando que o terminal imprime a via do cliente sem parâmetros adicionais.

**Acceptance Scenarios**:

1. **Given** uma transação foi aprovada anteriormente, **When** o desenvolvedor chama `reprintCustomerReceipt`, **Then** o terminal reimprime a via do cliente e a biblioteca retorna `PrintResult` (`{ result: 'ok', steps: number }`).
2. **Given** o SDK retorna falha durante a reimpressão, **When** `reprintCustomerReceipt` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_PRINT_ERROR` e a mensagem e `errorCode` do SDK.
3. **Given** o SDK lança `PlugPagException`, **When** `reprintCustomerReceipt` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_INTERNAL_ERROR`.
4. **Given** a biblioteca é usada em iOS, **When** `reprintCustomerReceipt` é chamado, **Then** a biblioteca rejeita imediatamente com mensagem explicativa.
5. **Given** uma transação foi aprovada anteriormente, **When** o desenvolvedor chama `doAsyncReprintCustomerReceipt`, **Then** o SDK notifica `PlugPagPrinterListener.onSuccess` e a biblioteca resolve com `PrintResult`.
6. **Given** o SDK notifica `PlugPagPrinterListener.onError`, **When** `doAsyncReprintCustomerReceipt` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_PRINT_ERROR`.
7. **Given** o SDK lança `PlugPagException` antes de invocar o listener (ex.: terminal não inicializado), **When** `doAsyncReprintCustomerReceipt` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_INTERNAL_ERROR` propagando `message` e `errorCode` da exceção.
8. **Given** a biblioteca é usada em iOS, **When** `doAsyncReprintCustomerReceipt` é chamado, **Then** a biblioteca rejeita imediatamente com mensagem explicativa.

---

### User Story 3 - Reimprimir Via do Estabelecimento (Priority: P3)

Um operador de terminal PagBank SmartPOS precisa reimprimir o comprovante da última transação aprovada para o arquivo do estabelecimento (controle interno, conciliação financeira). Ele aciona a reimpressão sem informar dados adicionais.

**Why this priority**: Complementar à reimpressão da via do cliente. Necessário para controle interno e processos de conciliação, mas com menor urgência do ponto de vista do usuário final.

**Independent Test**: Pode ser testado de forma independente após qualquer transação aprovada, verificando que o terminal imprime a via do estabelecimento sem parâmetros.

**Acceptance Scenarios**:

1. **Given** uma transação foi aprovada anteriormente, **When** o desenvolvedor chama `reprintEstablishmentReceipt`, **Then** o terminal reimprime a via do estabelecimento e a biblioteca retorna `PrintResult` (`{ result: 'ok', steps: number }`).
2. **Given** o SDK retorna falha durante a reimpressão, **When** `reprintEstablishmentReceipt` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_PRINT_ERROR` e a mensagem e `errorCode` do SDK.
3. **Given** o SDK lança `PlugPagException`, **When** `reprintEstablishmentReceipt` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_INTERNAL_ERROR`.
4. **Given** a biblioteca é usada em iOS, **When** `reprintEstablishmentReceipt` é chamado, **Then** a biblioteca rejeita imediatamente com mensagem explicativa.
5. **Given** uma transação foi aprovada anteriormente, **When** o desenvolvedor chama `doAsyncReprintEstablishmentReceipt`, **Then** o SDK notifica `PlugPagPrinterListener.onSuccess` e a biblioteca resolve com `PrintResult`.
6. **Given** o SDK notifica `PlugPagPrinterListener.onError`, **When** `doAsyncReprintEstablishmentReceipt` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_PRINT_ERROR`.
7. **Given** o SDK lança `PlugPagException` antes de invocar o listener (ex.: terminal não inicializado), **When** `doAsyncReprintEstablishmentReceipt` é chamado, **Then** a biblioteca rejeita com `PLUGPAG_INTERNAL_ERROR` propagando `message` e `errorCode` da exceção.
8. **Given** a biblioteca é usada em iOS, **When** `doAsyncReprintEstablishmentReceipt` é chamado, **Then** a biblioteca rejeita imediatamente com mensagem explicativa.

---

### Edge Cases

- **Arquivo inexistente**: `printFromFile` com caminho válido (não vazio) mas arquivo não existe no dispositivo → o SDK lança `PlugPagException`; a biblioteca captura e rejeita com `PLUGPAG_INTERNAL_ERROR` (não `PLUGPAG_PRINT_ERROR`, pois não é falha de hardware).
- **steps: 0**: valor abaixo do mínimo documentado (`MIN_PRINTER_STEPS = 70`) → o SDK aceita internamente; a biblioteca não bloqueia valores entre 0 e 69 para compatibilidade com implementações legadas (ver Assumptions).
- **steps: negativo**: valor negativo → a biblioteca rejeita com `PLUGPAG_VALIDATION_ERROR` antes de acionar o hardware.
- **Sem transação anterior**: `reprintCustomerReceipt` / `reprintEstablishmentReceipt` chamados sem transação prévia → o SDK retorna `PlugPagPrintResult.result != RET_OK`; a biblioteca rejeita com `PLUGPAG_PRINT_ERROR`.
- **Sem impressora** (`NO_PRINTER_DEVICE = -1040`): hardware não detectado → o SDK retorna `result = -1040`; a biblioteca rejeita com `PLUGPAG_PRINT_ERROR` incluindo o `errorCode` do SDK.
- **IPC falhou** (`PlugPagException`): serviço PagBank não respondeu → a biblioteca captura a exceção e rejeita com `PLUGPAG_INTERNAL_ERROR` propagando `message` e `errorCode` da exceção.
- **Variante async — resultado com `steps = 0`** (`NO_STEPS_PRINTED`): operação concluída mas nenhuma linha foi impressa → a biblioteca resolve com `{ result: 'ok', steps: 0 }` (sucesso conforme contrato do SDK).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A biblioteca DEVE expor uma função para impressão de imagem personalizada a partir de um arquivo local no dispositivo.
- **FR-002**: A função de impressão personalizada DEVE aceitar: caminho absoluto do arquivo (obrigatório), qualidade de impressão de 1 a 4 (opcional, padrão 4) e número de linhas em branco após impressão (opcional, padrão 70).
- **FR-003**: A biblioteca DEVE validar os parâmetros de entrada antes de acionar o hardware: o caminho não pode ser vazio; a qualidade deve estar entre 1 e 4; o número de linhas não pode ser negativo. Violações DEVEM rejeitar com código `PLUGPAG_VALIDATION_ERROR` e mensagem descritiva (sem acionar hardware).
- **FR-004**: A biblioteca DEVE expor uma função para reimprimir a via do cliente da última transação aprovada, sem parâmetros adicionais.
- **FR-005**: A biblioteca DEVE expor uma função para reimprimir a via do estabelecimento da última transação aprovada, sem parâmetros adicionais.
- **FR-011**: `printFromFile` DEVE ter exatamente **uma variante síncrona** (bloqueante via `Dispatchers.IO`). O SDK não expõe variante assíncrona com listener para este método.
- **FR-012**: `reprintCustomerReceipt` e `reprintEstablishmentReceipt` DEVEM ter **duas variantes**: síncrona (bloqueante via `Dispatchers.IO`, prefixo `reprint`) e assíncrona (listener nativo do SDK via `PlugPagPrinterListener`, prefixo `doAsync`). Nomes públicos: `reprintCustomerReceipt`, `doAsyncReprintCustomerReceipt`, `reprintEstablishmentReceipt`, `doAsyncReprintEstablishmentReceipt`.
- **FR-013**: O método SDK `reprintStablishmentReceipt` (grafia incorreta no SDK) DEVE ser chamado internamente pela biblioteca, que expõe `reprintEstablishmentReceipt` e `doAsyncReprintEstablishmentReceipt` com a grafia correta.
- **FR-006**: Todas as funções de impressão DEVEM retornar `PrintResult` (`{ result: 'ok'; steps: number }`) quando o hardware conclui a operação com sucesso, onde `steps` reflete o valor retornado pelo SDK.
- **FR-007**: Todas as funções DEVEM rejeitar com `PLUGPAG_PRINT_ERROR` quando `PlugPagPrintResult.result != RET_OK`, propagando os campos `message` e `errorCode` do `PlugPagPrintResult`.
- **FR-008**: Todas as funções DEVEM rejeitar com `PLUGPAG_INTERNAL_ERROR` quando o SDK lançar `PlugPagException` (ex.: falha de IPC, arquivo inexistente), propagando `message` e `errorCode` da exceção.
- **FR-014**: Tabela de códigos de erro para o domínio de impressão:
  - `PLUGPAG_VALIDATION_ERROR` — parâmetro de entrada inválido (validação antes do hardware)
  - `PLUGPAG_PRINT_ERROR` — SDK retornou `result != RET_OK` (ex.: `NO_PRINTER_DEVICE = -1040`)
  - `PLUGPAG_INTERNAL_ERROR` — `PlugPagException` capturada (falha de IPC/serviço)
- **FR-009**: Todas as funções DEVEM rejeitar imediatamente com mensagem explicativa quando chamadas em dispositivos iOS, sem acionar nenhum hardware.
- **FR-010**: As funções de reimpressão DEVEM operar sem parâmetros — a seleção da última transação é responsabilidade interna do SDK.

### Key Entities

Todos os tipos TypeScript públicos DEVEM ser definidos em **`src/printing.ts`** e re-exportados via `src/index.tsx` (Princípio IV — domínio único por módulo).

- **PrintRequest** (`src/printing.ts`): `{ filePath: string; printerQuality?: number; steps?: number }` — dados de entrada para `printFromFile`. `printerQuality` padrão 4; `steps` padrão 70 (`MIN_PRINTER_STEPS`).
- **PrintResult** (`src/printing.ts`): `{ result: 'ok'; steps: number }` — retorno de todas as funções de impressão bem-sucedidas. `steps` mapeia `PlugPagPrintResult.steps` do SDK.
- **PrintQuality** (`src/printing.ts`): const object `{ LOW: 1, MEDIUM: 2, HIGH: 3, MAX: 4 }` — escala discreta para `printerQuality`.
- **PlugPagPrinterData** (SDK interno): `PlugPagPrinterData(filePath: String, printerQuality: Int, steps: Int)` — instanciado apenas em `PagseguroPlugpagModule.kt`.
- **PlugPagPrinterListener** (SDK interno): interface `onSuccess(PlugPagPrintResult)` / `onError(PlugPagPrintResult)` — usada pelas variantes async de reimpressão em Kotlin.
- **PlugPagException** (SDK interno): `RuntimeException` com `message`, `cause`, `errorCode` — capturada em todos os métodos de impressão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desenvolvedores conseguem imprimir qualquer conteúdo visual personalizado em terminais PagBank SmartPOS com uma única chamada de função, sem etapas adicionais de configuração.
- **SC-002**: 100% das funções de impressão expõem erros distinguíveis por código — o desenvolvedor diferencia falha de validação, falha de hardware e erro interno sem inspecionar texto de mensagem.
- **SC-003**: Chamadas com parâmetros inválidos são rejeitadas antes de acionar o hardware — zero acionamentos desnecessários do terminal por erro de entrada do desenvolvedor.
- **SC-004**: A biblioteca opera corretamente em iOS sem travar ou crashar o aplicativo — todas as chamadas de impressão retornam erro descritivo e o app continua funcionando normalmente.
- **SC-005**: 100% das funções de impressão exportadas têm cobertura de teste automatizado, incluindo cenários de sucesso, falha de hardware e erro interno.

## Scope

### In Scope

- Impressão de imagem local (PNG, JPEG, BMP) com layout completamente personalizado pelo desenvolvedor.
- Reimpressão da via do cliente da última transação aprovada.
- Reimpressão da via do estabelecimento da última transação aprovada.
- Controle de qualidade de impressão (escala 1–4).
- Controle de espaçamento após impressão (linhas em branco).
- Validação de parâmetros de entrada antes de acionar o hardware.
- Tratamento de erros com códigos identificáveis e mensagens descritivas.
- Guarda de plataforma para iOS.

### Out of Scope

- Impressão de texto puro ou HTML.
- Geração do conteúdo visual da imagem — responsabilidade do aplicativo consumidor.
- Personalização da interface de usuário do terminal durante a impressão (botões, cores, textos na tela do terminal).
- Controle avançado do fluxo de impressão (imprimir/apagar/enviar por SMS).
- Configuração de listeners de eventos de impressão.

## Assumptions

- O aplicativo consumidor é responsável por gerar e salvar a imagem no dispositivo antes de chamar a função de impressão. A biblioteca recebe apenas o caminho de um arquivo já existente.
- O terminal já foi inicializado e ativado antes de qualquer chamada de impressão (pré-condição atendida pela feature de ativação do PinPad).
- Imagens com largura superior a 1155px são redimensionadas automaticamente pelo SDK — a biblioteca não precisa validar dimensões de imagem.
- O valor `steps: 0` é aceito pelo SDK mesmo sendo inferior ao mínimo documentado (70) — a biblioteca adota 70 como padrão mas permite valores menores para compatibilidade com implementações legadas.
- Apenas dispositivos Android são suportados; iOS está explicitamente fora de escopo.

## Dependencies

- Feature 001 (SDK Setup): Configuração e instalação do SDK PagBank já realizadas.
- Feature 002 (PinPad Activation): Terminal inicializado e ativado — pré-condição para qualquer operação de hardware.
- Feature 003 (Payment Methods): Tipo de resultado de impressão já mapeado e disponível para reuso.

## Clarifications

### Session 2026-03-29

- Q: Os métodos de impressão devem expor variante síncrona apenas, ou também uma variante assíncrona? → A (revisada após inspeção do AAR): `printFromFile` sync only (SDK não tem async); `reprintCustomerReceipt` e `reprintEstablishmentReceipt` com ambas as variantes (sync + async via `PlugPagPrinterListener`). Nomes públicos: `reprintCustomerReceipt`, `doAsyncReprintCustomerReceipt`, `reprintEstablishmentReceipt`, `doAsyncReprintEstablishmentReceipt`.
- Q: Qual o shape exato da interface TypeScript `PrintResult`? → A: `{ result: 'ok'; steps: number }`.
- Q: Qual código de erro para violações de validação de entrada (filePath vazio, quality fora de 1–4, steps negativo)? → A: Novo `PLUGPAG_VALIDATION_ERROR` — distinto de `PLUGPAG_PRINT_ERROR` (hardware) e `PLUGPAG_INTERNAL_ERROR` (exceção IPC), necessário para atender SC-002.
- Q: Onde definir os tipos TypeScript públicos (`PrintRequest`, `PrintResult`, `PrintQuality`)? → A: Arquivo novo `src/printing.ts`, re-exportado via `src/index.tsx` — segue Princípio IV da Constituição (domínio único por módulo).
- Q: Nas variantes async de reimpressão, como tratar `PlugPagException` lançada antes do listener ser invocado? → A: `PLUGPAG_INTERNAL_ERROR` para toda `PlugPagException` — consistente com variantes sync; `errorCode` da exceção é propagado para o desenvolvedor.
