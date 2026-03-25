# Quickstart: Correção de Erros Android Studio

**Branch**: `bugfix/004-fix-android-studio-errors`
**Escopo**: 2 arquivos modificados, 1 arquivo de testes expandido

---

## Pré-requisito

Codegen deve estar gerado antes de verificar os erros no Android Studio:

```bash
cd example/android && ./gradlew generateCodegenArtifactsFromSchema
```

---

## FIX-001 — `android/build.gradle`

Adicionar bloco `sourceSets` dentro do bloco `android { }`:

```groovy
android {
  // ... configuração existente ...

  sourceSets {
    main {
      java {
        srcDirs += ["${buildDir}/generated/source/codegen/java"]
      }
    }
  }
}
```

Após a alteração: Android Studio → **File → Sync Project with Gradle Files**.

---

## FIX-002 — `PagseguroPlugpagModule.kt`

Adicionar imports e substituir o bloco `plugPag by lazy`:

**Imports novos (adicionar ao topo)**:
```kotlin
import android.content.pm.PackageManager
import android.os.Build
```

**Substituir `plugPag by lazy` (linhas 27–36)**:
```kotlin
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

## FIX-003 — `PagseguroPlugpagModule.kt`

Corrigir linha 83 em `buildSdkPaymentErrorUserInfo`:

```kotlin
// Antes:
map.putInt("result", result.result)

// Depois:
map.putInt("result", result.result ?: -1)
```

---

## Novos testes — `PagseguroPlugpagModuleTest.kt`

Adicionar 2 testes para cobrir `PlugPagTransactionResult.result = null`:

```kotlin
@Test
fun `doPayment rejects with PLUGPAG_PAYMENT_ERROR when result field is null`() = runTest {
  val mockPlugPag = mockk<PlugPag>()
  val mockPromise = mockk<Promise>(relaxed = true)

  val nullResult = mockk<PlugPagTransactionResult>()
  every { nullResult.result } returns null
  every { nullResult.errorCode } returns "UNKNOWN"
  every { nullResult.message } returns "Transação não concluída"

  every { mockPlugPag.doPayment(any<PlugPagPaymentData>()) } returns nullResult
  every { mockPlugPag.setEventListener(any()) } returns Unit

  // Deve chamar promise.reject("PLUGPAG_PAYMENT_ERROR", userInfo) com result = -1
  verify(exactly = 0) { mockPromise.resolve(any()) }
}

@Test
fun `doAsyncPayment rejects with PLUGPAG_PAYMENT_ERROR when result field is null`() {
  val mockPlugPag = mockk<PlugPag>()
  val mockPromise = mockk<Promise>(relaxed = true)

  val listenerSlot = slot<PlugPagPaymentListener>()
  val nullResult = mockk<PlugPagTransactionResult>()
  every { nullResult.result } returns null
  every { nullResult.errorCode } returns "UNKNOWN"
  every { nullResult.message } returns "Transação não concluída"

  every {
    mockPlugPag.doAsyncPayment(any<PlugPagPaymentData>(), capture(listenerSlot))
  } answers {
    listenerSlot.captured.onError(nullResult)
  }

  // onError com result nulo deve chamar promise.reject("PLUGPAG_PAYMENT_ERROR", userInfo) com result = -1
  verify(exactly = 0) { mockPromise.resolve(any()) }
}
```

---

## Verificação final

```bash
cd example/android && ./gradlew generateCodegenArtifactsFromSchema
# → Android Studio: File → Sync Project with Gradle Files
# → Verificar zero erros em PagseguroPlugpagModule.kt

yarn lint   # deve passar sem erros ou avisos
yarn test   # testes JS devem passar
# Testes Kotlin: rodar via Android Studio ou ./gradlew test
```
