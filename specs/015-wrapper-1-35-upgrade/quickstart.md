# Quickstart — Upgrade PlugPagServiceWrapper 1.33.0 → 1.35.0

Guia operacional para aplicar e validar o bump. Ordem importa: editar referências vivas →
regenerar artefato do plugin → rodar gates.

## 1. Atualizar referências vivas de versão

Trocar `1.33.0` por `1.35.0` apenas nos pontos vivos (ver mapa completo em
`research.md` Decisão 3). **Não** tocar em registros históricos (`CLAUDE.md` L619-622/L633,
`CHANGELOG.md` L39, `specs/0*/`).

| Arquivo | O que muda |
|---|---|
| `android/build.gradle` | coordenada `implementation '...:wrapper:1.35.0'` |
| `plugin/index.ts` | string de injeção da dependência → `:wrapper:1.35.0` |
| `README.md` / `README-PTBR.md` | menção textual ao SDK subjacente |
| `CLAUDE.md` (linha "SDK Alvo") | `...:wrapper:1.35.0` |
| `.specify/memory/constitution.md` (§ SDK Version) | `...:wrapper:1.35.0` |
| `PagseguroPlugpagModule.kt` (comentário L31) | "SDK wrapper 1.35.0:" |

## 2. Adicionar entrada no CHANGELOG (FR-005)

Nova entrada no topo documentando o upgrade para `1.35.0`. Preservar a entrada histórica da
feature 001 (L39) intacta.

## 3. Regenerar o artefato compilado do plugin Expo (FR-002, edge case)

```bash
yarn prepare      # rebuilda a lib e plugin/build/index.js — o runtime do Expo lê daqui
```

## 4. Rodar os gates de qualidade (FR-006 / SC-002)

```bash
yarn lint         # zero erros ou avisos
yarn typecheck    # type-check completo
yarn test         # suíte Jest existente — sem novos testes
```

## 5. Validar resolução do AAR e build Android (SC-001 / SC-002)

```bash
yarn example android        # ou prebuild + gradle build do example
```

O build deve resolver e empacotar o AAR `wrapper:1.35.0` via Maven (URL inalterada) sem erros.

## 6. Verificar zero ocorrências remanescentes nos arquivos vivos (SC-003)

```bash
grep -rn "1\.33\.0" android/build.gradle plugin/ README.md README-PTBR.md \
  .specify/memory/constitution.md android/src/main/java
```

Não deve retornar referências de **versão ativa** (registros históricos preservados são
esperados e aceitáveis).

## Critérios de aceite atendidos

- **SC-001**: app consumidor roda fluxos existentes com zero alteração de código.
- **SC-002**: 100% dos gates verdes.
- **SC-003**: zero ocorrências de `1.33.0` nas referências vivas.
- **SC-004**: `1.35.0` consistente em 100% da documentação pública/permanente.
