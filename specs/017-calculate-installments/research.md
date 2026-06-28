# Phase 0 — Research: `calculateInstallments`

Todos os pontos de "NEEDS CLARIFICATION" foram resolvidos. A maior parte das decisões já
estava consolidada no `prd.md` (pesquisa por decompilação do AAR 1.35.0) e na `spec.md`.

---

## D1 — Qual sobrecarga do SDK usar

- **Decision**: Usar a sobrecarga **síncrona estruturada**
  `calculateInstallments(saleValue: String, installmentType: Int): List<PlugPagInstallment>`.
- **Rationale**: É a única que devolve dados estruturados (`quantity`/`amount`/`total`),
  permitindo ao consumidor montar a UI de parcelas. Confirmada **não-depreciada** na 1.35.0
  por `javap -v` sobre o AAR em cache.
- **Alternatives considered**:
  - `calculateInstallments(saleValue: String): Array<String>` — devolve apenas strings
    formatadas (`"R$ ##,##"`); descartada por não ser estruturada.
  - `asyncCalculateInstallments(saleValue, listener)` (herdada de `AsyncPlugPag`) — devolve
    só `String[]` via `onCalculateInstallments`, não aceita `installmentType` e não popula
    `onCalculateInstallmentsWithTotalAmount`. Descartada: agrega pouco e fica fora de escopo
    nesta fase (escolha do usuário no `prd.md` §2).

## D2 — Modelo de tratamento de erro

- **Decision**: `try/catch` no Kotlin. `catch (PlugPagException)` → `PLUGPAG_INSTALLMENTS_ERROR`
  (propaga `message` e `errorCode`); `catch (Exception)` → `PLUGPAG_INTERNAL_ERROR`
  (`buildInternalErrorUserInfo`).
- **Rationale**: O método síncrono **não** retorna `result`/`RET_OK` — sinaliza erro por
  exceção própria (`PlugPagException` com `message: String`, `errorCode: String`). Difere do
  padrão `doPayment` (que checa `RET_OK`). Códigos seguem a tabela da constituição.
- **Alternatives considered**: Reusar `buildSdkPaymentErrorUserInfo` (baseado em
  `PlugPagTransactionResult`) — inaplicável, pois não há `TransactionResult` aqui. Optou-se por
  um helper dedicado `buildInstallmentsErrorUserInfo(e: PlugPagException)`, espelhando
  `buildInternalErrorUserInfo`.

## D3 — Threading

- **Decision**: Executar a chamada do SDK em `CoroutineScope(Dispatchers.IO)`, resolvendo a
  Promise em `withContext(Dispatchers.Main)`. Comentário inline justificando a exceção ao
  Princípio VI.
- **Rationale**: A sobrecarga síncrona é **bloqueante por IPC** com o serviço PlugPag.
  Executá-la na main thread causaria ANR. Mesmo padrão já justificado em
  `initializeAndActivatePinPad` e na variante síncrona de `doPayment`.
- **Alternatives considered**: Usar um método async do SDK (Princípio VI default) — não existe
  variante async estruturada (ver D1).

## D4 — Unidade e tipo de `amount`

- **Decision**: `amount` na API pública é `number` em **centavos, inteiro `> 0`**. O Kotlin
  converte para `String` via `data.getInt("amount").toString()` (o SDK exige `saleValue: String`).
- **Rationale**: Consistência com `PlugPagPaymentRequest.amount` (centavos). A conversão para
  `String` é detalhe interno, não exposto ao consumidor (FR-011).
- **Alternatives considered**: Expor `string` na API pública — descartado por inconsistência
  com o restante do domínio `payment`.

## D5 — Regra de validação de `amount`

- **Decision**: Checagem **única combinada** `!(Number.isInteger(amount) && amount > 0)` com
  **uma única mensagem**: `calculateInstallments() — amount must be an integer > 0.`. `0`,
  negativo e não-inteiro caem todos na mesma regra.
- **Rationale**: Espelha o padrão de `maxTimeShowPopup` (feature/016) e a convenção de mensagem
  única do arquivo (`<método>() — <campo> <regra>.`). Mais rígido que `doPayment.amount`
  (`amount must be > 0.`), intencionalmente — cálculo de parcelas não faz sentido com fração.
- **Alternatives considered**: Reusar exatamente `doPayment.amount` (`> 0` apenas) — descartado
  para rejeitar não-inteiros de forma explícita. **Não altera** a validação existente de
  `doPayment` (SC-005, não-breaking).

## D6 — `installmentType`: enum novo ou reuso

- **Decision**: **Reusar** `InstallmentType` / `PlugPagInstallmentType` já definidos em
  `payment/types.ts`. Validação: `Object.values(InstallmentType).includes(data.installmentType)`.
- **Rationale**: FR-004 e Princípio IV (Open/Closed). Nenhum novo enum. Mensagem lista os
  valores aceitos (`A_VISTA, PARC_VENDEDOR, PARC_COMPRADOR`), espelhando `validatePaymentRequest`.
- **Alternatives considered**: Novo enum dedicado — descartado (duplicação, viola DRY/SOLID).

## D7 — Lista vazia do SDK

- **Decision**: `List` vazia → resolve com `{ options: [] }`. Não é erro.
- **Rationale**: FR-007 e Edge Cases da spec. Ausência de opções é um resultado válido de
  negócio, não uma falha.
- **Alternatives considered**: Rejeitar com erro — descartado; quebraria o contrato esperado.

## D8 — Variante async pública

- **Decision**: **Não** expor variante async nesta fase. Apenas `calculateInstallments` síncrono
  estruturado.
- **Rationale**: Escolha do usuário (`prd.md` §2). O async do SDK só devolveria `String[]`
  (ver D1), agregando pouco. Pode ser feature futura se necessário.
- **Alternatives considered**: Expor ambas — descartado por escopo.

## D9 — Forma de entrada

- **Decision**: Objeto `request` (`{ amount, installmentType }`), não argumentos posicionais.
- **Rationale**: Consistência com `PlugPagPaymentRequest` / `doPayment(data)`. Codegen exige
  `Object` na Spec.
- **Alternatives considered**: Argumentos posicionais — descartado por inconsistência de API.

## D10 — Versionamento

- **Decision**: Bump **patch** (`1.2.1` → `1.2.2`), entrada em `### Added` do CHANGELOG, commit
  `chore` separado (padrão da feature/016).
- **Rationale**: Adição puramente aditiva e não-breaking (SC-005). SemVer → patch para nova
  funcionalidade compatível neste projeto (segue precedente da feature/016).
- **Alternatives considered**: Minor bump — o projeto vem tratando adições de método como patch
  (feature/016), mantém-se o precedente.

---

**Output**: Todas as NEEDS CLARIFICATION resolvidas. Pronto para Phase 1.
