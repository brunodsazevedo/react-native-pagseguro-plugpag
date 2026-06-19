# Feature Specification: Atualização do PlugPagServiceWrapper 1.33.0 → 1.35.0

**Feature Branch**: `feature/015-wrapper-1-35-upgrade`
**Created**: 2026-06-19
**Status**: Draft
**Input**: User description: "crie a spec a partir da PRD.md" (upgrade do SDK PagBank wrapper de 1.33.0 para 1.35.0)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consumidor recebe a versão atualizada do SDK (Priority: P1)

Como aplicativo que integra a biblioteca em um terminal PagBank SmartPOS, ao atualizar para
a nova versão da biblioteca, passo a executar sobre o SDK PlugPagServiceWrapper 1.35.0 sem
precisar alterar meu código de integração.

**Why this priority**: É o objetivo central da feature — entregar o SDK mais recente
(suporte a novos terminais como GPOS780S/N950S e melhorias de resiliência de rede já
embarcadas no SDK) mantendo total compatibilidade com a API pública existente. Sem isso, a
feature não tem valor.

**Independent Test**: Atualizar a biblioteca num app de exemplo, compilar o build Android e
executar um fluxo de pagamento/ativação existente — tudo deve funcionar sem mudança de
código no app consumidor.

**Acceptance Scenarios**:

1. **Given** um app consumindo a versão anterior da biblioteca, **When** atualiza para a
   nova versão, **Then** o build Android resolve e empacota o AAR `wrapper:1.35.0` sem erros.
2. **Given** o código de integração existente (ativação, pagamento, estorno, impressão),
   **When** é executado sobre a 1.35.0, **Then** os fluxos funcionam sem qualquer alteração
   no app consumidor (zero breaking change na API pública).
3. **Given** a documentação pública da biblioteca, **When** o consumidor verifica a versão
   do SDK alvo, **Then** ela indica `1.35.0` de forma consistente em todas as referências.

---

### User Story 2 - Mantenedor confia que o upgrade não regrediu nada (Priority: P1)

Como mantenedor da biblioteca, ao subir a versão do wrapper, preciso de garantia automatizada
de que nada quebrou — lint, type-check, testes e build Android continuam verdes.

**Why this priority**: O upgrade só pode ser promovido a release se os gates de qualidade
existentes passarem. É a rede de segurança que torna o bump seguro.

**Independent Test**: Rodar a suíte de qualidade existente (`yarn lint`, `yarn typecheck`,
`yarn test`) e o build Android do example após o bump — todos devem permanecer verdes sem a
adição de novos testes.

**Acceptance Scenarios**:

1. **Given** o bump aplicado, **When** a suíte de qualidade é executada, **Then** lint,
   type-check e testes passam sem erros ou avisos.
2. **Given** o bump aplicado, **When** o build Android do example é executado, **Then**
   compila com sucesso resolvendo o novo AAR via Maven.
3. **Given** o build da biblioteca e do plugin Expo, **When** `yarn prepare` é executado,
   **Then** os artefatos gerados refletem a versão `1.35.0`.

---

### User Story 3 - Referências de versão ficam consistentes no repositório (Priority: P2)

Como mantenedor, ao subir a versão, quero que todas as referências "vivas" à versão do SDK
fiquem sincronizadas, evitando documentação contraditória.

**Why this priority**: Evita confusão futura e referências divergentes, mas não bloqueia o
funcionamento técnico do upgrade. Por isso P2.

**Independent Test**: Buscar pela versão antiga nos arquivos vivos do repositório após o
bump — não deve haver ocorrências remanescentes.

**Acceptance Scenarios**:

1. **Given** o bump concluído, **When** se busca a versão antiga (`1.33.0`) nos arquivos
   vivos (build, plugin Expo, documentação permanente, READMEs), **Then** não há ocorrências
   remanescentes.
2. **Given** o histórico de mudanças, **When** o CHANGELOG é consultado, **Then** existe uma
   nova entrada documentando o upgrade para `1.35.0`, sem reescrever entradas históricas.

---

### Edge Cases

- **Impressão livre sem TerminalService**: a documentação oficial da 1.35.0 indica
  descontinuação dessa funcionalidade **a nível de runtime do terminal** (a API
  `printFromFile` continua existindo, com zero diferença binária). Tratado como nota
  informativa — não bloqueia o upgrade nem o release. Recomenda-se validar impressão e
  reimpressão em SmartPOS real quando houver hardware disponível.
- **Resolução do AAR via Maven**: caso o repositório Maven não exponha a `1.35.0`, o build
  Android falha — coberto pelo gate de build do example.
- **Artefato compilado do plugin Expo desatualizado**: a versão consumida em runtime vem do
  artefato buildado do plugin, não apenas do fonte — o build da biblioteca deve ser
  regenerado para propagar a nova versão.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A biblioteca MUST declarar a dependência do SDK PagBank na versão `1.35.0` em
  sua configuração de build Android.
- **FR-002**: O plugin de configuração Expo MUST injetar a dependência do SDK na versão
  `1.35.0` nos projetos consumidores.
- **FR-003**: O upgrade MUST NOT exigir qualquer alteração na API pública da biblioteca
  (tipos, métodos exportados, contrato nativo) — é drop-in compatível.
- **FR-004**: A documentação permanente e pública (instruções do projeto, constituição,
  READMEs) MUST referenciar `1.35.0` como versão alvo do SDK, de forma consistente.
- **FR-005**: O histórico de mudanças MUST registrar uma nova entrada descrevendo o upgrade,
  preservando entradas históricas que mencionam a versão anterior.
- **FR-006**: O conjunto de gates de qualidade existente (lint, type-check, testes
  unitários, build Android) MUST continuar passando após o upgrade, sem necessidade de novos
  testes.
- **FR-007**: As especificações históricas de features anteriores MUST NOT ser reescritas —
  permanecem como registro fiel ao momento de cada feature.
- **FR-008**: As novas capacidades introduzidas pela 1.35.0 (novos modelos de terminal,
  flags de resiliência de rede, pré-autorização, NFC, onboarding, deeplink) são MUST NOT
  parte deste escopo — ficam registradas como oportunidades futuras.

### Key Entities

- **Versão do SDK alvo**: identificador da versão do PlugPagServiceWrapper que a biblioteca
  declara e documenta — transiciona de `1.33.0` para `1.35.0`.
- **Referências vivas de versão**: conjunto de pontos do repositório que descrevem a versão
  ativa do SDK (build, plugin Expo, documentação permanente, READMEs, changelog) — devem
  ficar sincronizados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um app consumidor atualiza para a nova versão e executa seus fluxos existentes
  (ativação, pagamento, estorno, impressão) com **zero** alteração de código de integração.
- **SC-002**: 100% dos gates de qualidade existentes (lint, type-check, testes, build
  Android) permanecem verdes após o upgrade.
- **SC-003**: Busca pela versão anterior (`1.33.0`) nos arquivos vivos do repositório retorna
  **zero** ocorrências após o bump.
- **SC-004**: A versão alvo do SDK é exibida como `1.35.0` de forma consistente em 100% das
  referências de documentação pública e permanente.

## Assumptions

- O upgrade é **drop-in compatível**, conforme o diff binário autoritativo já realizado
  (343 → 343 classes, zero quebra de API nos símbolos consumidos), documentado em
  `RELATORIO-WRAPPER-1.35.0.md`.
- A URL do repositório Maven que serve o SDK **não muda** com esta versão.
- As atualizações de plataforma que precediam este upgrade (React Native 0.85.3, Expo SDK 56,
  `@expo/config-plugins` ~56) já foram concluídas em features anteriores (013 e 014).
- Não há mudança no contrato nativo (Spec TurboModule), portanto a regeneração de codegen
  **não é necessária**.
- A validação de impressão em hardware real é recomendada, porém **não bloqueante** para
  concluir esta feature, por se tratar de comportamento a nível de runtime do terminal.
- O escopo limita-se à atualização de versão e sincronização de referências — sem adoção de
  novas funcionalidades do SDK.
