# Feature Specification: Correção de Erros Android Studio — PagseguroPlugpagModule

**Feature Branch**: `bugfix/004-fix-android-studio-errors`
**Created**: 2026-03-25
**Status**: Draft
**Input**: User description: "Crie spec a partir do PRD.md como bugfix — correção de erros Android Studio (CAUSA-1 codegen indexing, CAUSA-2 getPackageInfo deprecated, CAUSA-3 nullable result)"

## Contexto do Bug

Ao abrir `example/android` no Android Studio e navegar até `PagseguroPlugpagModule.kt`,
a IDE reporta aproximadamente 10 erros. O Gradle build e Gradle Sync funcionam sem
problemas — os erros são falsos positivos de análise estática ou riscos reais de null
safety que o compilador tolera mas que podem gerar crashes em runtime.

Três causas raiz foram identificadas e confirmadas via inspeção de bytecode do AAR
`wrapper-1.33.0`:

| ID | Causa | Erros | Risco |
|----|-------|-------|-------|
| CAUSA-1 | Diretório codegen não indexado pelo Android Studio | ~8 erros (`Unresolved reference`, `overrides nothing`) | Baixo (falso positivo — build funciona) |
| CAUSA-2 | `getPackageInfo(String, int)` depreciado na API 33+ | 1 aviso/erro IDE | Baixo (comportamento runtime idêntico) |
| CAUSA-3 | `PlugPagTransactionResult.result` é `Integer` boxed (nullable) | 0 erros IDE (latente) | **Alto — NPE silencia promise em runtime** |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Desenvolvedor abre projeto Android sem erros de IDE (Priority: P1)

Como desenvolvedor da biblioteca, quero abrir `example/android` no Android Studio e ver
zero erros em `PagseguroPlugpagModule.kt`, para poder navegar e depurar o código nativo
sem ruído.

**Why this priority**: Os ~8 erros de `Unresolved reference` e `overrides nothing`
provêm de uma única causa raiz (CAUSA-1) e são os mais visíveis. Eliminar esta causa
resolve a maior parte do problema imediatamente e desbloqueia toda a experiência de
desenvolvimento nativo.

**Independent Test**: Após aplicar FIX-001, o desenvolvedor abre o Android Studio,
realiza Gradle Sync e verifica que `PagseguroPlugpagModule.kt` não exibe nenhum
marcador vermelho de erro. Entrega valor imediato sem depender das demais correções.

**Acceptance Scenarios**:

1. **Given** o projeto `example/android` aberto no Android Studio após Gradle Sync, **When** o desenvolvedor navega até `PagseguroPlugpagModule.kt`, **Then** a IDE não exibe nenhum erro de `Unresolved reference` ou `overrides nothing`.

2. **Given** o codegen foi regenerado com `generateCodegenArtifactsFromSchema`, **When** o Android Studio realiza novo Gradle Sync, **Then** `NativePagseguroPlugpagSpec` é reconhecido como classe válida pelo IDE.

3. **Given** o diretório codegen ainda não foi gerado (repo recém-clonado), **When** o Gradle Sync é executado, **Then** a declaração de fontes adicionais não causa erro de build (diretório ausente é ignorado silenciosamente).

---

### User Story 2 — Código Kotlin compatível com Android API 24–36 sem avisos de depreciação (Priority: P2)

Como desenvolvedor da biblioteca, quero que a inicialização do módulo nativo use a
API correta de acordo com a versão do Android em execução, para que o Android Studio
não reporte avisos de depreciação e o comportamento seja correto em todo o range de
APIs suportadas (24–36).

**Why this priority**: CAUSA-2 é simples e de baixo risco, mas elimina um aviso/erro
de IDE visível e é a prática recomendada pelo Android para código com `minSdkVersion < 33`
e `compileSdkVersion >= 33`.

**Independent Test**: Após aplicar FIX-002, o Android Studio não exibe aviso de
depreciação na region de inicialização do módulo. Pode ser verificado independentemente
sem depender de FIX-001 ou FIX-003.

**Acceptance Scenarios**:

1. **Given** o `compileSdkVersion` do projeto é 33 ou superior, **When** o desenvolvedor abre `PagseguroPlugpagModule.kt` no Android Studio, **Then** nenhum aviso de API depreciada é exibido na região de inicialização do módulo.

2. **Given** um dispositivo rodando Android 13 (API 33+), **When** o módulo é inicializado, **Then** a variante moderna da API de informações de pacote é usada sem erro em runtime.

3. **Given** um dispositivo rodando Android 8–12 (API 24–32), **When** o módulo é inicializado, **Then** a variante legada (com supressão documentada) é usada e retorna o nome de versão do app corretamente.

---

### User Story 3 — Pagamento com resultado nulo não causa crash silencioso (Priority: P1)

Como usuário final (ou integrador da biblioteca), quero que uma transação de pagamento
com resultado indeterminado retorne uma mensagem de erro clara, para que o aplicativo
não trave silenciosamente sem feedback.

**Why this priority**: CAUSA-3 é o único risco real de runtime. O campo de resultado
da transação de pagamento pode ser nulo em terminais onde o SDK não consegue completar
a transação. Sem proteção, a serialização do erro lança uma exceção nula não capturada,
silenciando a promise e travando o app sem feedback. Impacto direto em produção.

**Independent Test**: Pode ser testado de forma isolada simulando um resultado de
transação com campo de resultado nulo. A promise deve rejeitar com código de erro
estruturado, não lançar exceção não capturada.

**Acceptance Scenarios**:

1. **Given** o SDK retorna um resultado de transação com campo `result` nulo, **When** `doPayment` ou `doAsyncPayment` processa o resultado, **Then** a promise é rejeitada com código `PLUGPAG_PAYMENT_ERROR` e valor de resultado `-1` (consistente com a convenção de erros internos).

2. **Given** o SDK retorna um resultado de transação com `result` não-nulo e diferente de sucesso, **When** `doPayment` ou `doAsyncPayment` processa o resultado, **Then** a promise é rejeitada com o valor real de `result` serializado corretamente.

3. **Given** o SDK retorna um resultado de transação de sucesso, **When** `doPayment` ou `doAsyncPayment` processa o resultado, **Then** a promise é resolvida normalmente — o caminho de sucesso não é afetado pela correção.

---

### Edge Cases

- O diretório codegen não existe ainda (repo recém-clonado): a declaração de fontes adicionais NÃO deve causar erro de build.
- `PlugPagTransactionResult.result` retorna `null` em conjunto com `errorCode` e `message` não-nulos: todos os campos devem ser serializados corretamente.
- Dispositivo com API exatamente 33 (TIRAMISU): a variante correta da API de informações de pacote deve ser selecionada.
- `PlugPagInitializationResult.result` é inteiro primitivo (não nullable): nenhuma alteração é necessária nesse campo — não deve ser confundido com `PlugPagTransactionResult.result`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A configuração de build Android DEVE declarar explicitamente o diretório de código gerado pelo codegen como fonte válida, garantindo que o Android Studio o reconheça após Gradle Sync.

- **FR-002**: A declaração de fontes adicionais DEVE ser idempotente — não causar falha de build caso o diretório codegen ainda não exista.

- **FR-003**: A inicialização do módulo nativo DEVE usar a variante correta da API de informações de pacote de acordo com a versão do Android em execução, cobrindo as APIs 24 a 36.

- **FR-004**: O código para versões de API inferiores a 33 DEVE documentar que a supressão do aviso de depreciação é intencional e justificada pela necessidade de compatibilidade com o range de APIs suportado.

- **FR-005**: A serialização do resultado de uma transação de pagamento DEVE tratar o campo de resultado como potencialmente nulo, substituindo `null` pelo valor sentinela `-1` ao construir a resposta de erro.

- **FR-006**: O valor sentinela `-1` para resultado nulo DEVE ser consistente com o valor já usado na serialização de erros internos do módulo.

- **FR-007**: O caminho de sucesso de `doPayment` e `doAsyncPayment` NÃO DEVE ser alterado — apenas os caminhos de erro que serializam o resultado de transação são afetados por FR-005.

- **FR-008**: Nenhum novo comportamento de negócio DEVE ser introduzido — as três correções são estritamente de qualidade de código e segurança de tipos.

- **FR-009**: DEVE ser adicionado ao menos um teste Kotlin (JUnit 5 + Mockk) que cubra explicitamente o cenário de `PlugPagTransactionResult.result = null`, verificando que a promise é rejeitada com código `PLUGPAG_PAYMENT_ERROR` e valor `-1` — para ambos os métodos `doPayment` e `doAsyncPayment`.

### Key Entities

- **Resultado de Transação de Pagamento**: Objeto retornado pelo SDK após uma operação de pagamento. O campo de código de resultado é um inteiro boxed (nullable) — valor `null` ocorre em terminais onde o SDK não conseguiu completar a transação.

- **Diretório de Código Gerado (Codegen)**: Conjunto de arquivos gerados automaticamente durante o Gradle build que definem o contrato da interface nativa. Precisa ser declarado explicitamente como fonte para ser reconhecido pelo indexador do Android Studio.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Após aplicar as três correções e realizar Gradle Sync, o Android Studio exibe **zero erros** em `PagseguroPlugpagModule.kt` (redução de ~10 para 0).

- **SC-002**: O Gradle build continua passando sem erros ou novos avisos após as correções — zero regressões de compilação introduzidas.

- **SC-003**: Uma transação de pagamento com campo de resultado nulo retornado pelo SDK resulta em promise rejeitada com mensagem de erro estruturada, **sem crash ou exceção não capturada** na camada nativa.

- **SC-004**: O módulo inicializa corretamente em dispositivos Android API 24 até API 36 sem aviso de depreciação no Android Studio.

- **SC-005**: Os testes Kotlin existentes continuam passando após as correções — zero regressões na suite de testes.

- **SC-006**: Existe ao menos um teste Kotlin automatizado que verifica o comportamento correto quando `PlugPagTransactionResult.result` é `null` — cobrindo `doPayment` e `doAsyncPayment`.

---

## Clarifications

### Session 2026-03-25

- Q: Para CAUSA-3 (null guard em `PlugPagTransactionResult.result`), deve-se adicionar um novo caso de teste Kotlin (JUnit 5 + Mockk) que simule `result = null`? → A: Sim — adicionar teste dedicado para `result = null`, cobrindo `doPayment` e `doAsyncPayment`.
- Q: A regeneração do codegen (`generateCodegenArtifactsFromSchema`) deve ser tarefa explícita ou apenas pré-condição? → A: Tarefa explícita — incluir como passo obrigatório de verificação após FIX-001.

---

## Assumptions

- O Gradle Sync e `generateCodegenArtifactsFromSchema` são executados como parte do processo normal de desenvolvimento após checkout de branch com spec alterada — este fluxo não é alterado pelas correções.
- O valor sentinela `-1` para resultado nulo é semanticamente equivalente a "erro desconhecido", alinhado com a convenção existente para erros internos do módulo.
- Não há terminais PagBank onde resultado nulo em `PlugPagTransactionResult` deve ser interpretado como sucesso — `null` é sempre um estado de erro ou indeterminado.
- As três correções são independentes entre si e podem ser aplicadas em qualquer ordem.

---

## Dependencies

- SDK `wrapper-1.33.0.aar` — bytecode inspecionado; tipos dos campos confirmados conforme documentado no PRD.
- Android Studio com suporte a Kotlin 2.x — ambiente onde os erros são visíveis.
- `compileSdkVersion 36` / `minSdkVersion 24` — define o range de APIs coberto por FR-003/FR-004.
- Codegen React Native — `generateCodegenArtifactsFromSchema` DEVE ser executado como tarefa explícita de verificação após FIX-001, para confirmar que FR-001 tem efeito visível no IDE (SC-001).

## References

- `PRD.md` (raiz do projeto) — diagnóstico completo, inspeção de bytecode e decisões aprovadas em 2026-03-25
- [PackageManager.getPackageInfo — Android Developers](https://developer.android.com/reference/android/content/pm/PackageManager#getPackageInfo(java.lang.String,%20android.content.pm.PackageManager.PackageInfoFlags))
- [Android sourceSets docs](https://developer.android.com/studio/build/build-variants#sourcesets)
- [React Native New Architecture — Library Creation](https://reactnative.dev/docs/the-new-architecture/create-module-library)
