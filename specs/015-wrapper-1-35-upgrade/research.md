# Phase 0 — Research: Upgrade PlugPagServiceWrapper 1.33.0 → 1.35.0

Esta feature não tem `NEEDS CLARIFICATION` em aberto: o diff binário autoritativo em
`RELATORIO-WRAPPER-1.35.0.md` já resolveu a única incerteza técnica (compatibilidade de API).
As decisões abaixo consolidam o que orienta a implementação.

## Decisão 1 — Bump drop-in sem regeneração de codegen

- **Decisão**: Trocar a coordenada Gradle de `wrapper:1.33.0` para `wrapper:1.35.0` e propagar
  a versão às referências vivas. Não regenerar o codegen Android.
- **Rationale**: O diff binário (`javap` sobre `classes.jar` dos dois AARs) mostra 343 → 343
  classes, **0** métodos com mudança de assinatura entre os símbolos consumidos e **0** data
  classes alteradas (`PlugPagPaymentData`, `PlugPagVoidData`, `PlugPagPrinterData`,
  `PlugPagActivationData`, `PlugPagTransactionResult`, `PlugPagPrintResult`,
  `PlugPagInitializationResult`). A Spec TurboModule (`NativePagseguroPlugpag.ts`) não muda →
  o gatilho de codegen (alteração da spec) não ocorre.
- **Alternativas consideradas**: Regenerar codegen por precaução — rejeitada: sem alteração na
  spec, o artefato gerado é idêntico; regenerar adicionaria ruído de diff sem ganho.

## Decisão 2 — URL Maven permanece inalterada

- **Decisão**: Manter `maven { url 'https://github.com/pagseguro/PlugPagServiceWrapper/raw/master' }`.
- **Rationale**: A PagSeguro migrou o slug do repositório
  (`pagseguro/pagseguro-sdk-plugpagservicewrapper`), mas o caminho `raw/master` continua
  servindo os artefatos. O coordenado Gradle (`br.com.uol.pagseguro.plugpagservice.wrapper:wrapper`)
  não mudou. Não existe `1.34.0` publicada — a sequência salta de `1.33.0` para `1.35.0`.
- **Alternativas consideradas**: Apontar para o novo slug — rejeitada: desnecessário e
  arriscaria quebrar a resolução do AAR sem benefício.

## Decisão 3 — Distinção entre referência viva e registro histórico

- **Decisão**: Atualizar para `1.35.0` apenas as referências que descrevem a **versão ativa**
  do SDK. Preservar entradas que são **registro histórico** de features passadas.
- **Referências VIVAS a sincronizar (→ 1.35.0)**:
  | Arquivo | Local | FR |
  |---|---|---|
  | `android/build.gradle` | L76 — `implementation '...wrapper:1.33.0'` | FR-001 |
  | `plugin/index.ts` | L11 — string de injeção da dependência | FR-002 |
  | `README.md` | L32 — "The underlying SDK is `PlugPagServiceWrapper 1.33.0`" | FR-004 |
  | `README-PTBR.md` | L33 — "O SDK subjacente é o `PlugPagServiceWrapper 1.33.0`" | FR-004 |
  | `CLAUDE.md` | L11 — "**SDK Alvo**" (referência ativa) | FR-004 |
  | `.specify/memory/constitution.md` | L262 — "The library targets ...wrapper:1.33.0" | FR-004 |
  | `android/.../PagseguroPlugpagModule.kt` | L31 — comentário "SDK wrapper 1.33.0:" | FR-004 |
  | `CHANGELOG.md` | nova entrada de upgrade no topo | FR-005 |
- **Referências HISTÓRICAS a preservar (NÃO reescrever — FR-007)**:
  | Arquivo | Local | Por quê |
  |---|---|---|
  | `CLAUDE.md` | L619-622, L633 — "Active Technologies" / "Recent Changes" por feature (003-006) | Registro fiel do que cada feature usava no seu momento |
  | `CHANGELOG.md` | L39 — entrada do "SDK Setup & Expo Config Plugin" (feature 001) | Histórico da integração inicial com 1.33.0 |
  | `specs/0*/` | specs de features anteriores | FR-007 explícito |
- **Rationale**: Misturar atualização de versão com reescrita de histórico apaga rastreabilidade.
  A entrada de CHANGELOG da feature 001 e os logs por-feature do CLAUDE.md documentam o estado
  no momento — devem permanecer.
- **Alternativas consideradas**: Substituir todas as ocorrências de `1.33.0` cegamente
  (`sed -i`) — rejeitada: violaria FR-007 e corromperia o histórico.

## Decisão 4 — Propagação ao artefato compilado do plugin Expo

- **Decisão**: Após editar `plugin/index.ts`, rodar `yarn prepare` para regenerar
  `plugin/build/index.js`.
- **Rationale**: O runtime do Expo lê a versão do **artefato buildado** do plugin, não do
  fonte TS. Editar só o fonte deixaria consumidores recebendo `1.33.0` em runtime (edge case
  explícito da spec).
- **Alternativas consideradas**: Editar manualmente `plugin/build/index.js` — rejeitada:
  artefato gerado não deve ser editado à mão; `yarn prepare` é a fonte de verdade do build.

## Decisão 5 — Validação por gates existentes (sem novos testes)

- **Decisão**: Usar a suíte existente como rede de segurança: `yarn lint`, `yarn typecheck`,
  `yarn test`, `yarn prepare` e build Android do example.
- **Rationale**: FR-006 — não há código novo testável; a API pública e o contrato nativo não
  mudam. O valor está em confirmar que nada regrediu, não em criar cobertura nova.
- **Nota de hardware (não bloqueante)**: A doc da 1.35.0 indica descontinuação da impressão
  livre sem `TerminalService` a nível de **runtime do terminal** (a API `printFromFile`
  continua existindo, zero diff binário). Recomenda-se validar impressão/reimpressão em
  SmartPOS real quando houver hardware — não bloqueia esta feature.

**Output**: Todas as incertezas resolvidas. Nenhum `NEEDS CLARIFICATION` remanescente.
