# PRD — Suporte a `maxTimeShowPopup` do `PlugPagCustomPrinterLayout`

> **Documento temporário de pesquisa e discussão.** Não faz parte da estrutura
> arquitetural permanente. A documentação definitiva da feature será criada em
> `specs/<NNN>-max-time-show-popup/` quando a implementação for priorizada.

- **Issue de origem**: [#12](https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues/12) — _Feature Sugerida: Suporte a maxTimeShowPopup do PlugPagCustomPrinterLayout_
- **Autor da sugestão**: @marcelozepn
- **SDK alvo**: `PlugPagServiceWrapper:1.35.0`
- **Status**: 📋 Em elaboração (PRD)

---

## 1. Contexto e Problema

Durante operações que disparam impressão de comprovante (ex.: via do cliente em
`doPayment` / `doRefund`), o terminal PagBank exibe um **popup** que aguarda uma ação
do operador. Enquanto o operador não interage, o fluxo do `doPayment` **não finaliza** —
a Promise fica pendente, travando a UX da aplicação consumidora.

O SDK oferece a propriedade `maxTimeShowPopup`, que define o tempo máximo de exibição
desse popup antes de fechá-lo automaticamente, liberando o fluxo sem intervenção manual.

Atualmente a biblioteca **não expõe** essa configuração.

---

## 2. Validação contra a Documentação do SDK

A capacidade foi **confirmada por inspeção direta** do bytecode do `wrapper-1.35.0.aar`.

### 2.1. Classe `PlugPagCustomPrinterLayout`

A classe existe e expõe o campo `maxTimeShowPopup` com getter/setter:

```
private int maxTimeShowPopup;
public final int  getMaxTimeShowPopup();
public final void setMaxTimeShowPopup(int);
```

Construtor completo (9 parâmetros — todos os campos do layout):

```
PlugPagCustomPrinterLayout(
  String title, String titleColor, String confirmTextColor, String cancelTextColor,
  String windowBackgroundColor, String buttonBackgroundColor,
  String buttonBackgroundColorDisabled, String sendSMSTextColor,
  int maxTimeShowPopup
)
```

Construtor default `PlugPagCustomPrinterLayout()` inicializa `maxTimeShowPopup = 0`.

### 2.2. Método de aplicação `IPlugPagWrapper`

```
public abstract void setPlugPagCustomPrinterLayout(PlugPagCustomPrinterLayout);
```

### 2.3. Sample oficial do wrapper

O AAR inclui o sample `PlugPagWrapperSamplesKt.setPlugPagCustomPrinterLayoutSample`,
que demonstra o uso oficial:

```kotlin
// Reconstrução a partir do bytecode do sample oficial (1.35.0)
val plugPag: IPlugPagWrapper = PlugPag(context)
val layout = PlugPagCustomPrinterLayout(
  "Título",      // title
  "16769024",    // titleColor
  "1",           // confirmTextColor
  "7829368",     // cancelTextColor
  "14761072",    // windowBackgroundColor
  "1",           // buttonBackgroundColor
  "1",           // buttonBackgroundColorDisabled
  "16769024",    // sendSMSTextColor
  10             // maxTimeShowPopup  ← valor 10 no sample oficial
)
plugPag.setPlugPagCustomPrinterLayout(layout)
```

> ✅ **Unidade definida: SEGUNDOS.** O valor `maxTimeShowPopup` representa o tempo
> máximo de exibição do popup em **segundos** (o sample oficial usa `10`, ou seja,
> 10 segundos). A proposta original da issue (`5000`) partia da premissa de
> milissegundos — premissa **descartada**. O **default é `0`** (popup aguarda o
> operador indefinidamente) e **não há valor mínimo** imposto pelo SDK.
>
> A biblioteca **não converte** o valor — repassa o `int` cru (em segundos) ao SDK.
> Documentação (tipos, README, JSDoc) deve declarar a unidade como **segundos**.

---

## 3. Decisões de Escopo

| Decisão | Escolha | Justificativa |
|---|---|---|
| Operações cobertas | `doPayment`, `doAsyncPayment`, **`doRefund`** | Todas disparam o popup de impressão; a issue cobria só pagamento, mas o estorno tem o mesmo bloqueio. |
| Forma da API | Campo único `maxTimeShowPopup?: number` | Atende ao caso de uso relatado sem inflar a superfície. Demais campos do layout (cores/título) ficam para feature futura, se houver demanda. |
| Compatibilidade | Campo **opcional** — sem breaking change | Ausência do campo ⇒ comportamento atual idêntico. |

---

## 4. API Pública Proposta

### 4.1. TypeScript — Tipos

```typescript
// src/functions/payment/types.ts
export interface PlugPagPaymentRequest {
  type: PlugPagPaymentType;
  amount: number;
  installmentType: PlugPagInstallmentType;
  installments: number;
  userReference?: string;
  printReceipt?: boolean;
  /**
   * Tempo máximo de exibição do popup de impressão, em SEGUNDOS, antes de fechar
   * automaticamente. Quando omitido, mantém o comportamento padrão do SDK
   * (popup aguarda o operador indefinidamente — equivalente a `0`).
   */
  maxTimeShowPopup?: number;
}

// src/functions/refund/types.ts
export interface PlugPagRefundRequest {
  transactionCode: string;
  transactionId: string;
  voidType: PlugPagVoidTypeValue;
  printReceipt?: boolean;
  maxTimeShowPopup?: number; // mesma semântica (segundos) de PlugPagPaymentRequest
}
```

### 4.2. Comportamento

- `maxTimeShowPopup` **preenchido** → aplicar `setPlugPagCustomPrinterLayout(layout)`
  imediatamente **antes** da chamada SDK (`doPayment` / `doAsyncPayment` / `voidPayment`).
- `maxTimeShowPopup` **ausente** → não tocar no layout; comportamento atual preservado.

### 4.3. Exemplo de consumo

```typescript
const result = await doPayment({
  type: PaymentType.CREDIT,
  amount: totalCents,
  installmentType: InstallmentType.A_VISTA,
  installments: 1,
  printReceipt: true,
  userReference: orderId,
  maxTimeShowPopup: 10, // popup fecha sozinho após 10 segundos — fluxo não trava aguardando operador
});
```

---

## 5. Arquivos Afetados na Codebase

| # | Arquivo | Mudança | Camada |
|---|---|---|---|
| 1 | `src/functions/payment/types.ts` | Adicionar `maxTimeShowPopup?: number` em `PlugPagPaymentRequest` | TS — tipos |
| 2 | `src/functions/refund/types.ts` | Adicionar `maxTimeShowPopup?: number` em `PlugPagRefundRequest` | TS — tipos |
| 3 | `src/functions/payment/index.ts` | Validação opcional do campo em `validatePaymentRequest` (ver §6) | TS — lógica |
| 4 | `src/functions/refund/index.ts` | Validação opcional equivalente para refund | TS — lógica |
| 5 | `android/.../PagseguroPlugpagModule.kt` | Aplicar layout antes de `doPayment`/`doAsyncPayment`/`voidPayment` | Kotlin — módulo |
| 6 | `src/__tests__/functions/payment.test.ts` | Cenários do novo campo (ver §7.1) | Testes JS |
| 7 | `src/__tests__/functions/refund.test.ts` | Cenários do novo campo para refund | Testes JS |
| 8 | `android/src/test/.../PagseguroPlugpagModuleTest.kt` | Cenários de aplicação/omissão do layout (ver §7.2) | Testes Kotlin |
| 9 | `README.md` / `README-PTBR.md` | Linha do campo nas tabelas `PlugPagPaymentRequest` e `PlugPagRefundRequest` (linhas ~473/484) | Docs |
| 10 | `CLAUDE.md` | Atualizar inventário de tipos da API pública | Docs internas |

### 5.1. Observações importantes

- **`NativePagseguroPlugpag.ts` NÃO muda.** As assinaturas já usam `data: Object` para
  `doPayment`/`doAsyncPayment`/`doRefund`. Logo, **o codegen Android NÃO precisa ser
  regenerado** — o novo campo trafega dentro do `ReadableMap` existente.
- A constituição (Princípio IV) exige que `PlugPag` só seja chamado dentro de
  `PagseguroPlugpagModule.kt` — a aplicação do layout fica nesse módulo, OK.
- `PlugPagCustomPrinterLayout` é um novo `import` no módulo Kotlin.

---

## 6. Validação e Tratamento de Erro

A issue sugeriu envolver `setPlugPagCustomPrinterLayout` em `try/catch` que apenas loga
e segue. **Isso conflita com a Constituição (Princípio V — Fail-Fast: "Fallback silencioso
é proibido").**

### Diretriz adotada

A validação segue **exatamente o mesmo padrão da constituição já implementado** nos
demais métodos (`validatePaymentRequest`, guards de plataforma, helpers de erro do
Kotlin). Nenhum tratamento novo ou especial é introduzido — apenas reaproveita os
mecanismos existentes:

- **Validação JS (fail-fast, antes do nativo)**: se `maxTimeShowPopup` for fornecido, deve
  ser um número inteiro `>= 0` (default `0`, sem mínimo). Caso contrário, lançar `Error`
  com prefixo `[react-native-pagseguro-plugpag] ERROR:` — idêntico às demais validações
  em `validatePaymentRequest`.
- **Camada Kotlin**: aplicar o layout dentro do **mesmo `try/catch` que já envolve a
  operação inteira**. Se a aplicação do layout falhar, a exceção propaga como
  `PLUGPAG_INTERNAL_ERROR` via `buildInternalErrorUserInfo(e)` (comportamento atual) —
  **não** engolir silenciosamente (Princípio V — Fail-Fast).
- Não há novo código de erro: reaproveita `PLUGPAG_INTERNAL_ERROR` / `PLUGPAG_PAYMENT_ERROR`
  / `PLUGPAG_REFUND_ERROR` existentes.

---

## 7. Cenários de Teste

### 7.1. Testes JS (Jest) — `payment.test.ts` / `refund.test.ts`

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | `doPayment` **sem** `maxTimeShowPopup` | Resolve normalmente; nativo recebe request sem o campo (regressão = comportamento atual) |
| 2 | `doPayment` **com** `maxTimeShowPopup: 10` | Resolve; nativo recebe `maxTimeShowPopup: 10` no payload (`toHaveBeenCalledWith`) |
| 3 | `doPayment` com `maxTimeShowPopup` negativo | Rejeita com prefixo `ERROR:` (validação fail-fast) |
| 4 | `doPayment` com `maxTimeShowPopup` não-inteiro (ex.: `1.5`) | Rejeita com prefixo `ERROR:` |
| 5 | iOS guard com o campo presente | Rejeita com prefixo `ERROR:` (guard precede validação) |
| 6 | `doAsyncPayment` com `maxTimeShowPopup` | Idêntico ao síncrono (paridade) |
| 7 | `doRefund` com/sem `maxTimeShowPopup` | Espelha cenários 1–3 para refund |

### 7.2. Testes Kotlin (JUnit 5 + Mockk) — `PagseguroPlugpagModuleTest.kt`

| # | Cenário | Verificação |
|---|---|---|
| 1 | `doPayment` com `maxTimeShowPopup` presente | `verify { plugPag.setPlugPagCustomPrinterLayout(match { it.maxTimeShowPopup == <valor> }) }` chamado **antes** de `doPayment` |
| 2 | `doPayment` **sem** o campo | `verify(exactly = 0) { plugPag.setPlugPagCustomPrinterLayout(any()) }` |
| 3 | `voidPayment` (refund) com o campo | `setPlugPagCustomPrinterLayout` aplicado antes de `voidPayment` |
| 4 | `setPlugPagCustomPrinterLayout` lança exceção | Promise rejeita com `PLUGPAG_INTERNAL_ERROR` (sem swallow) |
| 5 | `doAsyncPayment` com o campo | Layout aplicado antes de `doAsyncPayment` |

> Os testes Kotlin seguem o padrão existente: `mockk<PlugPag>(relaxed = true)`,
> captura via `slot<>()` e `verify`. O mock do `PlugPagCustomPrinterLayout` usa
> `match { }` sobre a propriedade `maxTimeShowPopup`.

---

## 8. Checklist de Implementação (Constituição)

- [ ] Testes JS escritos **antes** da implementação e confirmados como falhando (TDD).
- [ ] Testes Kotlin de integração para os 3 métodos afetados.
- [ ] `maxTimeShowPopup` opcional em `PlugPagPaymentRequest` e `PlugPagRefundRequest`.
- [ ] Validação fail-fast no JS (sem fallback silencioso).
- [ ] Aplicação do layout dentro do `try/catch` existente no Kotlin.
- [ ] `yarn lint` zero erros/avisos · `yarn typecheck` · `yarn test` verdes.
- [ ] **Codegen NÃO regenerado** (spec inalterada — confirmar que nada em `NativePagseguroPlugpag.ts` mudou).
- [ ] README EN/PT-BR e inventário de tipos no CLAUDE.md atualizados — declarando a unidade em **segundos**.

---

## 9. Questões Resolvidas

Todas as questões levantadas durante a pesquisa foram esclarecidas pelo mantenedor:

1. ✅ **Unidade do `maxTimeShowPopup`** — **segundos**. A premissa de milissegundos da
   issue original foi descartada.
2. ✅ **Valor mínimo** — **não há** piso imposto pelo SDK. O **default é `0`** (popup
   aguarda o operador indefinidamente).
3. ✅ **Persistência do layout** — `setPlugPagCustomPrinterLayout` **não** afeta
   transações subsequentes de forma persistente: é aplicado **apenas quando solicitado**
   (ou seja, somente quando `maxTimeShowPopup` é informado no request). Quando o campo é
   omitido, o módulo **não chama** `setPlugPagCustomPrinterLayout` — logo, **não é
   necessário resetar** para `0` em um `finally`. O comportamento padrão é preservado
   naturalmente pela ausência da chamada.
