# PRD — Bugfix: Fallback Silencioso em Tipos de Pagamento, Parcelamento e Estorno

**Data**: 2026-04-28
**Relacionado**: [Issue #10](https://github.com/brunodsazevedo/react-native-pagseguro-plugpag/issues/10)
**Branch alvo**: `bugfix/011-fail-fast-type-validation` *(sugestão)*
**Status**: Decisões fechadas — pronto para implementação

---

## 1. Contexto e Motivação

A issue #10 identificou que as implementações de `doPayment` e `doAsyncPayment` no módulo
nativo Kotlin usam expressões `when` com cláusula `else` que faz **fallback silencioso**
para valores padrão quando o tipo de pagamento ou de parcelamento não corresponde a nenhum
valor esperado.

A análise interna confirmou o problema — e revelou que o escopo real é **maior** do que a
issue reportou: o mesmo padrão existe em `doRefund`.

---

## 2. Diagnóstico Técnico

### 2.1 Onde o bug existe

**`PagseguroPlugpagModule.kt` — três métodos afetados:**

| Método | Campo | Fallback silencioso para |
|---|---|---|
| `doPayment` (linha 176) | `type` | `PlugPag.TYPE_CREDITO` |
| `doPayment` (linha 182) | `installmentType` | `PlugPag.INSTALLMENT_TYPE_A_VISTA` |
| `doAsyncPayment` (linha 226) | `type` | `PlugPag.TYPE_CREDITO` |
| `doAsyncPayment` (linha 232) | `installmentType` | `PlugPag.INSTALLMENT_TYPE_A_VISTA` |
| `doRefund` (linha 278) | `voidType` | `PlugPag.VOID_PAYMENT` |

**Código problemático (padrão idêntico nos três métodos):**

```kotlin
val type = when (data.getString("type")) {
  "CREDIT" -> PlugPag.TYPE_CREDITO
  "DEBIT"  -> PlugPag.TYPE_DEBITO
  "PIX"    -> PlugPag.TYPE_PIX
  else     -> PlugPag.TYPE_CREDITO   // ← fallback silencioso
}
```

### 2.2 Por que o TypeScript não protege suficientemente

A pergunta natural é: *"o TypeScript garante que só chegam valores válidos — por que
corrigir o Kotlin?"*. A proteção existe, mas é **incompleta**:

| Camada | Proteção | Limitação |
|---|---|---|
| `PlugPagPaymentType` (union type) | ✅ Compile-time | Só funciona em código TypeScript com strict mode |
| `validatePaymentRequest()` | ⚠️ Parcial | Valida `amount`, `installments` e regras de negócio, mas **não valida `type` nem `installmentType` contra os valores permitidos** |
| Kotlin `when` sem `else` seguro | ❌ Ausente | Aceita qualquer `String` vinda do JS em runtime |

**O `else` nativo é alcançável quando:**

- A biblioteca é consumida via JavaScript puro (sem TypeScript) — cenário real para muitos
  integradores.
- O dado vem de uma API JSON sem validação de tipo em runtime (ex: configuração do backend
  enviando `"type": "CREDITO"` em vez de `"CREDIT"`).
- O consumidor usa `as any` ou `@ts-ignore` (prática comum em projetos legados).
- Um novo valor de enum é adicionado ao TypeScript no futuro, mas o Kotlin não é atualizado
  junto — o `else` volta a ser ativo silenciosamente.

### 2.3 Violações com a Constituição do Projeto

O comportamento atual viola princípios já estabelecidos:

- **Princípio V — Fail-Fast**: *"qualquer chamada DEVE lançar erro explícito. Fallback
  silencioso é **proibido**."*
- **Princípio IV — Clean Code**: contratos de tipo devem ser respeitados em todas as
  camadas, não apenas na camada JS.

---

## 3. Escopo da Correção

### 3.1 Correção obrigatória — camada Kotlin (núcleo do bug)

Substituir os `else` silenciosos por rejeição explícita da promise nos três métodos.

**Abordagem recomendada — lançar `IllegalArgumentException` dentro do `try` existente:**

```kotlin
val type = when (data.getString("type")) {
  "CREDIT" -> PlugPag.TYPE_CREDITO
  "DEBIT"  -> PlugPag.TYPE_DEBITO
  "PIX"    -> PlugPag.TYPE_PIX
  else     -> throw IllegalArgumentException(
    "Invalid payment type: '${data.getString("type")}'. Expected: CREDIT, DEBIT or PIX."
  )
}
```

O bloco `catch (e: Exception)` já existente em todos os três métodos captura a exceção e
rejeita a promise com `PLUGPAG_INTERNAL_ERROR`. Nenhuma nova estrutura de controle é
necessária — a correção é cirúrgica.

**✅ Decisão A (fechada)**: usar `PLUGPAG_INTERNAL_ERROR` (código existente). Sem breaking
change semântico na API pública. O valor inválido é incluído na mensagem para facilitar
debug (ver decisão C).

### 3.2 Camada TypeScript (`validatePaymentRequest`)

**✅ Decisão B (fechada)**: não adicionar validação de `type`/`installmentType` no
TypeScript. O compilador já cobre consumidores TS com `strict: true`. A camada Kotlin
passa a ser a barreira de runtime para todos os casos que escapam (JS puro, dados
dinâmicos). Evita duplicação de lógica de validação em dois lugares.

### 3.3 Validação equivalente em `doRefund`

O campo `voidType` em `doRefund` tem o mesmo problema. A correção deve cobrir os três
métodos para encerrar o padrão completamente.

---

## 4. Impacto e Riscos

### 4.1 Comportamento antes × depois

| Cenário | Antes (fallback silencioso) | Depois (fail-fast) |
|---|---|---|
| `type: "CREDITO"` (typo) | Processa como crédito sem aviso | Rejeita com erro claro |
| `type: undefined` | Processa como crédito sem aviso | Rejeita com erro claro |
| `installmentType: "PARCELADO"` (inválido) | Processa como à vista sem aviso | Rejeita com erro claro |
| `voidType: "ESTORNO"` (inválido) | Estorna como `VOID_PAYMENT` sem aviso | Rejeita com erro claro |
| Entrada válida | Funciona normalmente | Funciona normalmente (sem impacto) |

### 4.2 Risco de breaking change

**Baixo** para consumidores que já usam os tipos corretos (comportamento idêntico).

**Alto** para consumidores que dependiam (acidentalmente) do fallback silencioso — mas
esse comportamento nunca foi documentado nem garantido. A correção torna o comportamento
consistente com o contrato TypeScript já publicado.

### 4.3 Classificação de versão

A mudança é um **bugfix de comportamento incorreto não documentado**. Pode ser lançada como
`patch` (`1.x.y+1`) pela semver, pois corrige comportamento que nunca deveria ter existido.

---

## 5. Requisitos de Testes

### 5.1 Testes Kotlin (novos cenários)

Para cada método corrigido (`doPayment`, `doAsyncPayment`, `doRefund`), adicionar:

- `type inválido → rejeita promise` (com `data.getString("type") = "INVALIDO"`)
- `installmentType inválido → rejeita promise` (payment apenas)
- `voidType inválido → rejeita promise` (refund apenas)

### 5.2 Testes TypeScript

**✅ Decisão B (fechada)**: nenhum teste TypeScript novo necessário para esta correção.
Os testes JS existentes (`payment.test.ts`, `refund.test.ts`) continuam válidos sem
alteração.

---

## 6. Decisões (fechadas)

| # | Questão | Decisão |
|---|---|---|
| **A** | Código de erro para input inválido | ✅ `PLUGPAG_INTERNAL_ERROR` — reutiliza código existente, sem breaking change |
| **B** | Validação TS em `validatePaymentRequest` | ✅ Não adicionar — compilador TS já cobre; Kotlin é a barreira de runtime |
| **C** | Expor o valor inválido na mensagem de erro | ✅ Incluir — ex: `"Invalid payment type: 'CREDITO'. Expected: CREDIT, DEBIT or PIX."` |

---

## 7. Branch e Arquivos Afetados

```
bugfix/011-fail-fast-type-validation
```

| Arquivo | Mudança |
|---|---|
| `android/src/main/java/com/pagseguroplugpag/PagseguroPlugpagModule.kt` | Substituir os 5 `else` silenciosos por `throw IllegalArgumentException(...)` |
| `android/src/test/java/com/pagseguroplugpag/PagseguroPlugpagModuleTest.kt` | Adicionar cenários de rejeição por tipo inválido (RED → GREEN) |
| `README.md` | Atualizar descrição de `PLUGPAG_INTERNAL_ERROR` nas seções Payment e Refund para incluir input inválido |
| `README-PTBR.md` | Idem em português |

TypeScript (`src/functions/payment/index.ts`, `src/functions/refund/index.ts`) **não será
alterado** — decisão B.

---

## 8. Próximos Passos

1. Criar a branch `bugfix/011-fail-fast-type-validation`.
2. Escrever testes Kotlin para os novos cenários de rejeição (RED):
   - `doPayment` — `type` inválido rejeita com `PLUGPAG_INTERNAL_ERROR`
   - `doPayment` — `installmentType` inválido rejeita com `PLUGPAG_INTERNAL_ERROR`
   - `doAsyncPayment` — `type` inválido rejeita com `PLUGPAG_INTERNAL_ERROR`
   - `doAsyncPayment` — `installmentType` inválido rejeita com `PLUGPAG_INTERNAL_ERROR`
   - `doRefund` — `voidType` inválido rejeita com `PLUGPAG_INTERNAL_ERROR`
3. Corrigir os três métodos em `PagseguroPlugpagModule.kt` (GREEN).
4. Atualizar `README.md` e `README-PTBR.md` — descrição de `PLUGPAG_INTERNAL_ERROR` nas seções Payment e Refund.
5. `yarn lint` + `yarn typecheck` + `yarn test`.
6. PR referenciando a issue #10.
