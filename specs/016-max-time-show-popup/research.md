# Phase 0 — Research: `maxTimeShowPopup`

Todas as incógnitas técnicas resolvidas. Nenhum `NEEDS CLARIFICATION` pendente.

## Decisão 1 — Unidade do campo: segundos

- **Decision**: `maxTimeShowPopup` é expresso em **segundos** (inteiro).
- **Rationale**: Confirmado por inspeção do bytecode do `wrapper-1.35.0.aar`
  (`PlugPagCustomPrinterLayout.maxTimeShowPopup: Int`) e pelo sample oficial da PagSeguro, que
  usa o valor `10`. A hipótese de milissegundos da issue original (#12) foi descartada.
- **Alternatives considered**: Milissegundos (rejeitado — incompatível com o sample oficial e
  com a magnitude prática de um timeout de popup).

## Decisão 2 — Ponto de aplicação no SDK

- **Decision**: Aplicar via
  `plugPag.setPlugPagCustomPrinterLayout(PlugPagCustomPrinterLayout().apply { maxTimeShowPopup = N })`
  **imediatamente antes** de `doPayment` / `doAsyncPayment` / `voidPayment`.
- **Rationale**: Inspeção do `.aar` confirma:
  - `PlugPagCustomPrinterLayout()` — construtor sem-args (demais campos com defaults do SDK).
  - `setMaxTimeShowPopup(Int)` — setter do campo.
  - `PlugPag.setPlugPagCustomPrinterLayout(layout)` — método público de aplicação.
  Aplicar logo antes da operação garante que o layout vale para o popup daquela transação.
- **Alternatives considered**:
  - Construtor completo com todos os campos (rejeitado — exigiria expor cores/título fora de
    escopo; o construtor sem-args + setter isola o único campo relevante).
  - Aplicar uma única vez na inicialização (rejeitado — o campo é per-request opcional;
    aplicação global vazaria configuração entre transações, violando a premissa de não-persistência).

## Decisão 3 — Spec TurboModule inalterada / sem codegen

- **Decision**: Não alterar `NativePagseguroPlugpag.ts`; o campo trafega dentro do payload
  `Object` já existente de `doPayment`/`doAsyncPayment`/`doRefund`.
- **Rationale**: As assinaturas da spec são `(data: Object): Promise<Object>`. Adicionar uma
  chave ao objeto não muda a assinatura, logo a regra de regeneração de codegen (CLAUDE.md /
  Constituição) **não é disparada**. Menor superfície de risco, sem rebuild do spec Java.
- **Alternatives considered**: Parâmetro nativo dedicado (rejeitado — quebraria a assinatura,
  exigiria codegen e seria menos coeso com o request).

## Decisão 4 — Validação fail-fast no lado JS

- **Decision**: Validar no JS, antes de qualquer chamada nativa, que `maxTimeShowPopup` (quando
  presente) é `Number.isInteger(v) && v >= 0`; senão lançar `Error` prefixado
  `[react-native-pagseguro-plugpag] ERROR:`. O guard de plataforma (iOS) precede a validação.
- **Rationale**: FR-006/FR-007/FR-008. Consistente com o padrão de `validatePaymentRequest` /
  `validateRefundRequest` já existente. `0` é aceito (default do SDK = popup indefinido).
- **Alternatives considered**: Validar só no Kotlin (rejeitado — o padrão do projeto é
  fail-fast no JS, com mensagem identificável por prefixo antes do IPC).

## Decisão 5 — Tratamento de falha ao aplicar o layout

- **Decision**: A chamada `setPlugPagCustomPrinterLayout` ocorre dentro do mesmo `try` que
  envolve a operação; qualquer exceção é propagada como `PLUGPAG_INTERNAL_ERROR` (fluxo de
  `catch` já existente). Nenhum fallback silencioso.
- **Rationale**: FR-009. Reusa o tratamento de erro estruturado já presente no módulo Kotlin.
- **Alternatives considered**: Engolir falha de layout e seguir a transação (rejeitado —
  proibido pela spec e pelo espírito fail-fast da Constituição).

## Decisão 6 — Posicionamento do tipo (Constituição Princípio IV)

- **Decision**: Adicionar `maxTimeShowPopup?: number` em **ambos** `PlugPagPaymentRequest`
  (`functions/payment/types.ts`) e `PlugPagRefundRequest` (`functions/refund/types.ts`) —
  duplicação intencional.
- **Rationale**: A regra de posicionamento de tipos manda compartilhar (`src/types/`) apenas o
  que é usado por ≥2 domínios **como o mesmo tipo**. Aqui são campos de interfaces de request
  distintas; cross-domain import entre `payment` e `refund` é proibido. Logo, cada domínio
  declara o campo no próprio `types.ts`.
- **Alternatives considered**: Tipo compartilhado em `src/types/` (rejeitado — não há entidade
  comum; só um campo escalar coincidente, e a duplicação respeita o isolamento de domínio).
