# Contract — `isAuthenticated` & `asyncIsAuthenticated` (domínio `activation`)

## API pública (`src/functions/activation/index.ts`)

```typescript
/** Consulta síncrona (SDK bloqueante por IPC). Resolve true/false; false NÃO é erro. */
export async function isAuthenticated(): Promise<boolean>;

/** Consulta assíncrona via listener RxJava do SDK. Resolve true/false; false NÃO é erro. */
export async function asyncIsAuthenticated(): Promise<boolean>;
```

Cada função DEVE conter o guard Nível 2 antes de chamar `getNativeModule()`:

```typescript
if (Platform.OS !== 'android') {
  throw new Error(
    '[react-native-pagseguro-plugpag] ERROR: isAuthenticated() is not available on iOS. PagSeguro PlugPag SDK is Android-only.'
  );
}
```

## TurboModule Spec (`src/NativePagseguroPlugpag.ts`)

```typescript
isAuthenticated(): Promise<boolean>;
asyncIsAuthenticated(): Promise<boolean>;
```

> ⚠️ Após editar a Spec: `cd example/android && ./gradlew generateCodegenArtifactsFromSchema`.

## Contrato Kotlin (`PagseguroPlugpagModule.kt`)

```kotlin
import br.com.uol.pagseguro.plugpagservice.wrapper.listeners.PlugPagIsActivatedListener

override fun isAuthenticated(promise: Promise) {
  // Threading Policy (Constituição VI): bloqueante por IPC — Dispatchers.IO
  CoroutineScope(Dispatchers.IO).launch {
    try {
      val authenticated = plugPag.isAuthenticated()
      withContext(Dispatchers.Main) { promise.resolve(authenticated) }
    } catch (e: Exception) {
      withContext(Dispatchers.Main) {
        promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
      }
    }
  }
}

override fun asyncIsAuthenticated(promise: Promise) {
  // Threading Policy (Constituição VI): callback RxJava exige Looper na main (Issue #13)
  UiThreadUtil.runOnUiThread {
    try {
      plugPag.asyncIsAuthenticated(object : PlugPagIsActivatedListener {
        override fun onIsActivated(isActivated: Boolean) {
          promise.resolve(isActivated) // 'false' é resultado válido → resolve
        }
        override fun onError(errorMessage: String) {
          val map = WritableNativeMap()
          map.putInt("result", -1)
          map.putString("errorCode", "AUTHENTICATION_ERROR")
          map.putString("message", errorMessage)
          promise.reject("PLUGPAG_AUTHENTICATION_ERROR", map)
        }
      })
    } catch (e: Exception) {
      promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
    }
  }
}
```

## Tabela de contrato (entrada → saída)

| Função | Condição | Resultado |
|---|---|---|
| ambas | `Platform.OS !== 'android'` | reject `Error` com prefixo `[react-native-pagseguro-plugpag] ERROR:` + nome do método |
| ambas | terminal ativado | resolve `true` |
| ambas | terminal não ativado | resolve `false` (não rejeita) |
| `asyncIsAuthenticated` | SDK `onError(msg)` | reject `PLUGPAG_AUTHENTICATION_ERROR` (preserva `msg`) |
| ambas | exceção não-SDK | reject `PLUGPAG_INTERNAL_ERROR` |

## Cenários de teste JS (`src/__tests__/functions/activation.test.ts`)

`describe('isAuthenticated')`: (1) iOS rejeita prefixado; (2) Android resolve `true`;
(3) Android resolve `false`; (4) Android exceção → `PLUGPAG_INTERNAL_ERROR`.

`describe('asyncIsAuthenticated')`: (1) iOS rejeita prefixado; (2) resolve `true`;
(3) resolve `false`; (4) `onError` → `PLUGPAG_AUTHENTICATION_ERROR`; (5) exceção → `PLUGPAG_INTERNAL_ERROR`.

## Cenários de teste Kotlin (JUnit 5 + Mockk — placeholders estruturais)

`isAuthenticated`: resolve true / resolve false / exceção → `PLUGPAG_INTERNAL_ERROR`.
`asyncIsAuthenticated`: `onIsActivated(true)`→resolve / `onIsActivated(false)`→resolve /
`onError`→`PLUGPAG_AUTHENTICATION_ERROR` / exceção→`PLUGPAG_INTERNAL_ERROR`.
Lembrete: `mockkStatic(UiThreadUtil::class)` no `@BeforeEach`, runnable síncrono (`firstArg<Runnable>().run(); true`).
