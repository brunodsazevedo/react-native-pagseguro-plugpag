# Phase 1 — Contracts: Upgrade PlugPagServiceWrapper 1.33.0 → 1.35.0

## Não aplicável — sem mudança de contrato externo

A API pública da biblioteca (tipos exportados por `src/index.ts`, funções de domínio e o
contrato nativo `NativePagseguroPlugpag.ts`) **não muda** nesta feature (FR-003 — drop-in
compatível).

- Nenhum método novo exposto a consumidores.
- Nenhuma assinatura de método alterada.
- Nenhum evento `NativeEventEmitter` adicionado ou modificado.

O upgrade é binário-compatível (343 → 343 classes, 0 mudanças nos símbolos consumidos), logo
não há contrato a versionar. Consumidores existentes continuam compilando e executando sem
qualquer alteração de código de integração.
