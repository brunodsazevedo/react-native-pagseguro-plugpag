# Research: Correção de Erros Android Studio

**Feature**: `bugfix/004-fix-android-studio-errors`
**Date**: 2026-03-25
**Status**: COMPLETO — todas as questões resolvidas via inspeção de bytecode (PRD.md)

---

## R-001 — Causa raiz dos ~8 erros de `Unresolved reference` no Android Studio

**Decision**: Declarar explicitamente o diretório codegen como `sourceSets` no `android/build.gradle`.

**Rationale**: O plugin `com.facebook.react` adiciona o diretório
`build/generated/source/codegen/java` ao classpath do compilador Kotlin (Gradle), mas o
indexador do Android Studio nem sempre herda essa configuração. A declaração explícita via
`sourceSets.main.java.srcDirs` garante que o IDE reconheça `NativePagseguroPlugpagSpec` após
qualquer Gradle Sync, sem depender do comportamento do plugin React Native.

**Alternatives considered**:
- *Invalidate Caches only*: Solução temporária — exige repetição após cada Gradle Sync limpo. Rejeitada por ser operacional, não estrutural.
- *Mover codegen para diretório não-gerado*: Viola o contrato do codegen RN. Rejeitada.

**Evidence**: Padrão documentado no React Native New Architecture — Library Creation docs;
confirmado que o Gradle build funciona (compilador tem o path) mas IDE não (indexação separada).

**Fix**:
```groovy
// android/build.gradle — dentro do bloco android { }
sourceSets {
  main {
    java {
      srcDirs += ["${buildDir}/generated/source/codegen/java"]
    }
  }
}
```

Idempotente: se o diretório não existir (repo recém-clonado), o source set é ignorado silenciosamente.

---

## R-002 — API correta de `getPackageInfo` para Android API 24–36

**Decision**: Branch de versão com `Build.VERSION_CODES.TIRAMISU` (API 33) como threshold.
API < 33: usar overload `(String, Int)` com `@Suppress("DEPRECATION")`.
API ≥ 33: usar overload `(String, PackageManager.PackageInfoFlags)` introduzido na API 33.

**Rationale**:
- `PackageManager.getPackageInfo(String, int)` foi depreciado na API 33 (Android 13 / TIRAMISU).
- `compileSdkVersion 36` ativa a análise de depreciação no Android Studio.
- `minSdkVersion 24` obriga manter o branch legado para APIs 24–32.
- `@Suppress("DEPRECATION")` é a convenção Android oficial para código de compatibilidade — não é abuso.

**Alternatives considered**:
- *Suprimir globalmente*: Arriscado — mascara outras depreciações. Rejeitado.
- *Elevar minSdkVersion para 33*: Quebra compatibilidade com terminais mais antigos. Rejeitado.

**Fix**:
```kotlin
import android.content.pm.PackageManager
import android.os.Build

private val plugPag: PlugPag by lazy {
  val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    reactApplicationContext.packageManager.getPackageInfo(
      reactApplicationContext.packageName,
      PackageManager.PackageInfoFlags.of(0L)
    )
  } else {
    // Compatibilidade com Android API 24–32 (abaixo de TIRAMISU).
    // getPackageInfo(String, int) foi depreciado na API 33.
    // O branch else é obrigatório dado minSdkVersion 24.
    @Suppress("DEPRECATION")
    reactApplicationContext.packageManager.getPackageInfo(
      reactApplicationContext.packageName,
      0
    )
  }
  val versionName = packageInfo.versionName ?: "1.0"
  val appIdentification = PlugPagAppIdentification(
    reactApplicationContext.packageName,
    versionName
  )
  PlugPag(reactApplicationContext, appIdentification)
}
```

---

## R-003 — Tipo real de `PlugPagTransactionResult.result` no SDK wrapper-1.33.0

**Decision**: Tratar `result.result` como `Int?` (nullable) em todos os pontos de uso em `buildSdkPaymentErrorUserInfo`. Usar `?: -1` como valor sentinela.

**Rationale**: Confirmado via `javap` no bytecode do AAR `wrapper-1.33.0.aar`:
- `PlugPagTransactionResult.result` → `java.lang.Integer` (boxed) → `Int?` em Kotlin
- `PlugPagInitializationResult.result` → `int` (primitivo) → `Int` em Kotlin — **sem problema**

O Gradle build compila sem erro porque o compilador Kotlin 2.x lê metadados do AAR como
platform type (`Integer!`), permitindo o acesso sem null-check. O Android Studio aplica
análise estática mais rigorosa e reporta o mismatch. Em runtime, `null` causaria NPE em
`map.putInt("result", result.result)` — silenciaria a promise sem feedback.

Valor sentinela `-1` é consistente com `buildInternalErrorUserInfo` (linha 53).

**Alternatives considered**:
- *Usar `result.result!!`*: Lança NPE explícita mas não capturável dentro do `withContext`. Rejeitado.
- *Envolver em try-catch separado*: Over-engineering — uma expressão Elvis resolve. Rejeitado.

**Fix**:
```kotlin
// buildSdkPaymentErrorUserInfo (linha 83)
// Antes: map.putInt("result", result.result)
// Depois:
map.putInt("result", result.result ?: -1)
```

---

## R-004 — Cobertura de testes para CAUSA-3 (FR-009, SC-006)

**Decision**: Adicionar 2 testes Kotlin em `PagseguroPlugpagModuleTest.kt`:
1. `doPayment rejects with PLUGPAG_PAYMENT_ERROR when result field is null`
2. `doAsyncPayment rejects with PLUGPAG_PAYMENT_ERROR when result field is null`

**Rationale**: Spec exige explicitamente (FR-009, SC-006). O MockK permite `every { errorResult.result } returns null` para simular `Int?` nulo.

**Alternatives considered**:
- *Testar apenas `doPayment`*: Insuficiente — `doAsyncPayment` chama `buildSdkPaymentErrorUserInfo` via `onError` com o mesmo risco. Rejeitado.

---

## Resoluções Abertas

Nenhuma — todas as questões estavam respondidas no PRD.md (diagnóstico concluído em 2026-03-25).

| Item | Status |
|------|--------|
| Tipo de `PlugPagTransactionResult.result` | ✅ Confirmado: `java.lang.Integer` (bytecode) |
| Tipo de `PlugPagInitializationResult.result` | ✅ Confirmado: `int` primitivo — sem impacto |
| API `getPackageInfo` API 33+ | ✅ `PackageManager.PackageInfoFlags.of(0L)` |
| Valor sentinela para null | ✅ `-1` (consistente com convenção existente) |
| Fix de build idempotente | ✅ `srcDirs +=` ignora diretório ausente |
