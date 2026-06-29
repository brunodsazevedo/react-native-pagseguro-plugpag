# Quickstart — Consulta de Estado de Ativação (`isAuthenticated`)

## Uso na aplicação

```typescript
import { isAuthenticated, initializeAndActivatePinPad } from 'react-native-pagseguro-plugpag';

// Antes de abrir a tela de venda, checar se precisa ativar o terminal
const authenticated = await isAuthenticated();
if (!authenticated) {
  await initializeAndActivatePinPad(activationCode);
}
// terminal pronto → seguir para a venda
```

Variante assíncrona (paridade com os demais `doAsync*`):

```typescript
import { asyncIsAuthenticated } from 'react-native-pagseguro-plugpag';

const authenticated = await asyncIsAuthenticated();
```

> `false` significa "terminal não ativado" — é um resultado **válido**, não um erro. A Promise
> resolve com `false`. Apenas falhas reais rejeitam (`PLUGPAG_AUTHENTICATION_ERROR` na variante
> assíncrona; `PLUGPAG_INTERNAL_ERROR` para exceções internas).

## Ordem de implementação (TDD — PRD §7)

1. Criar branch `feature/019-is-authenticated` (já criada).
2. **Testes JS primeiro** (devem falhar) — `activation.test.ts` com os cenários do contrato.
3. Adicionar `isAuthenticated`/`asyncIsAuthenticated` (`Promise<boolean>`) na `Spec`.
4. **Regenerar codegen** (`cd example/android && ./gradlew generateCodegenArtifactsFromSchema`) — BLOQUEANTE.
5. Implementar as 2 funções públicas em `activation/index.ts`.
6. Implementar os 2 overrides Kotlin + import `wrapper.listeners.PlugPagIsActivatedListener`.
7. Testes de integração Kotlin (placeholders estruturais — feature/018).
8. `yarn lint` + `yarn typecheck` + `yarn test` — todos verdes.
9. Atualizar READMEs (EN/PT-BR) e CLAUDE.md (API pública + tabela de status).
10. (Opcional) Demonstração no `example/src/App.tsx`.
11. Validar build Android do example.

## Validação (gates)

```bash
yarn lint        # zero erros/avisos
yarn typecheck   # zero erros
yarn test        # suíte JS verde (inclui os novos describes)
cd example/android && ./gradlew :react-native-pagseguro-plugpag:test   # Kotlin
```

## Critérios de aceite (spec)

- SC-001: descobrir o estado com uma única chamada, sem disparar ativação/transação.
- SC-002: terminal não ativado → 100% resolvem `false` (zero rejeições nesse caminho).
- SC-003: 100% das funções exportadas com cobertura unitária (iOS, true, false, erro de domínio, erro interno).
- SC-004: iOS → 100% rejeitam com erro prefixado, sem acessar o nativo.
- SC-005: zero regressão na suíte existente.
