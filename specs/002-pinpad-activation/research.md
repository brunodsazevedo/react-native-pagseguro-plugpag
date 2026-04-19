# Pesquisa — Feature 002: Ativação do PinPad

**Branch**: `feature/002-pinpad-activation`
**Data**: 2026-03-21
**Status**: Completo

---

## Decisão 1: Threading para Variante Síncrona do SDK

**Decisão**: Usar `CoroutineScope(Dispatchers.IO)` para executar `initializeAndActivatePinpad` (método síncrono/bloqueante do SDK).

**Justificativa**: O método `initializeAndActivatePinpad` realiza comunicação IPC (binder) com o serviço PlugPagService e é inerentemente bloqueante — pode levar vários segundos. Chamá-lo na thread principal causaria ANR. O uso de `Dispatchers.IO` é portanto **exigido pelo comportamento do SDK**, o que justifica a exceção à regra da Constituição Princípio VI ("corrotinas proibidas a menos que o SDK exija").

**Relação com a Constituição**: Princípio VI permite corrotinas quando o SDK as exige. A variante síncrona do SDK exige threading explícito — logo a exceção é válida e deve ser documentada no código.

**Alternativas consideradas**:
- `ExecutorService` (padrão legado em Java): rejeitado — padrão Java, não idiomático em Kotlin 2.x.
- Chamar diretamente na thread do React Native: rejeitado — ANR garantido em operações longas.
- Usar apenas `doAsyncInitializeAndActivatePinpad`: rejeitado — o PRD exige exposição de ambas as variantes; a variante síncrona é a equivalente direta da lib legado.

---

## Decisão 2: Assinatura de `promise.reject` com Erro Estruturado

**Decisão**: Usar `promise.reject(code: String, userInfo: WritableMap)` — variante 2-arg disponível na API de `Promise` do React Native para TurboModules.

**Justificativa**: A interface `com.facebook.react.bridge.Promise` expõe `reject(String code, WritableMap userInfo)` como variante válida. Isso permite transmitir o `code` (distingue tipo de erro no JS via `error.code`) e `userInfo` (mapa estruturado com `result`, `errorCode`, `message`) em uma única chamada.

**Alternativas consideradas**:
- `promise.reject(code, message, userInfo)` — 3-arg: válida, mas redundante; `message` já está em `userInfo.message`.
- `promise.reject(code, throwable)` — sem `userInfo` estruturado: insuficiente para transmitir `result` numérico e `errorCode` separados.

---

## Decisão 3: Dois Códigos de Erro RN Distintos

**Decisão**: Dois códigos de erro distintos no nível do RN:
- `"PLUGPAG_INITIALIZATION_ERROR"` — para falhas mapeadas pelo SDK (`result != RET_OK`)
- `"PLUGPAG_INTERNAL_ERROR"` — para exceções inesperadas em runtime

**Justificativa**: O consumidor JS precisa distinguir os dois cenários sem parsear strings de mensagem. Códigos distintos permitem `if (error.code === 'PLUGPAG_INITIALIZATION_ERROR')` no catch. Alinhado com clarificação Q3 da spec (sensibilidade do activation code: nunca deve aparecer em mensagens de erro).

**Alternativas consideradas**:
- Código único com campo diferenciador em `userInfo`: rejeitado — dificulta o switch no consumidor.
- Usar campo `result: -1` como sentinela sem código distinto: rejeitado — pouco explícito e frágil.

---

## Decisão 4: Payload de Sucesso `{ result: 'ok' }`

**Decisão**: Ambas as funções resolvem com `{ result: 'ok' }` em caso de sucesso. Nenhum campo adicional é incluído.

**Justificativa**: Simplicidade e clareza. O consumidor não precisa de metadados adicionais em caso de sucesso — a ativação bem-sucedida significa que o terminal está pronto. Erros chegam exclusivamente via rejeição (FR-007).

**Alternativas consideradas**:
- Incluir `result: 0` (código numérico do SDK): rejeitado — semanticamente idêntico ao sucesso; exporia internos do SDK desnecessariamente.
- Resolver com `undefined`/`null`: rejeitado — menos explícito; dificulta futura extensão sem quebrar contrato.

---

## Decisão 5: Estratégia de Thread-Safety para `doAsyncInitializeAndActivatePinPad`

**Decisão**: Não usar corrotinas. O SDK gerencia threading internamente via `PlugPagActivationListener`. `promise.resolve/reject` são chamados diretamente nos callbacks do listener (sem despachar para `Dispatchers.Main`).

**Justificativa**: O projeto usa RN 0.83.2, bem acima do RN 0.65+ que garantiu thread-safety de `Promise.resolve/reject`. Não é necessário despachar para a Main thread, simplificando a implementação.

**Alternativas consideradas**:
- Despachar para `Dispatchers.Main` nos callbacks: desnecessário em RN 0.83.2; adicionaria complexidade sem benefício.
- Usar `withContext(Dispatchers.Main)` por consistência com a variante síncrona: rejeitado — consistência desnecessária quando o comportamento correto é mais simples.

---

## Decisão 6: Padrão de Teste para Erros Estruturados em Jest

**Decisão**: Simular erros estruturados usando `Object.assign(new Error(...), { code: '...', userInfo: {...} })` no `mockRejectedValue`. Usar o padrão de `jest.resetModules()` + `require` dinâmico já estabelecido no arquivo de testes existente.

**Justificativa**: O padrão já existe em `index.test.tsx` e o time conhece o mecanismo. Erros do RN bridge nativamente têm as propriedades `code` e `userInfo` — simular com `Object.assign` é a forma padrão de replicar esse shape em testes de unidade Jest.

**Alternativas consideradas**:
- Criar uma classe `RNError` customizada: overhead desnecessário para testes de unidade.
- Testar apenas com `expect(fn).rejects.toThrow(...)`: insuficiente para verificar `error.code` e `error.userInfo`.

---

## Decisão 7: Escopo de Detecção de Dispositivo (Princípio V da Constituição)

**Decisão**: **DEFERIDO** — Detecção de dispositivo POS vs não-POS (Princípio V) não está no escopo da feature 002.

**Justificativa**: O PRD desta feature não cobre detecção de dispositivo. Implementar detecção agora aumentaria o escopo e a complexidade além do que foi especificado. A detecção de dispositivo deve ser uma feature própria (ex: `003-device-detection`) que será implementada antes da publicação da lib.

**Impacto**: Até que a feature 003 seja implementada, a lib não estará em conformidade total com o Princípio V. Isso é aceitável em desenvolvimento (sem impacto em produção pois a lib ainda não está publicada).

**Rastreamento**: Anotado como item pendente na seção de Complexity Tracking do `plan.md`.
