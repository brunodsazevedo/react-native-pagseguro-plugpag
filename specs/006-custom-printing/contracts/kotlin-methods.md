# Kotlin Method Contracts — Feature 006 Custom Printing

## New imports required in PagseguroPlugpagModule.kt

```kotlin
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPrinterData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPrinterListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPrintResult
```

Note: `PlugPagPrinterListener` is in the root wrapper package, NOT in `listeners`.

---

## New helper: buildPrintErrorUserInfo

```kotlin
private fun buildPrintErrorUserInfo(result: PlugPagPrintResult): WritableNativeMap {
  val map = WritableNativeMap()
  map.putInt("result", result.result)
  map.putString("errorCode", result.errorCode ?: "")
  map.putString("message", result.message?.takeIf { it.isNotEmpty() } ?: "Unknown error")
  return map
}
```

---

## printFromFile

```kotlin
override fun printFromFile(data: ReadableMap, promise: Promise) {
  // EXCEPTION (Constituição Princípio VI): SDK printFromFile é bloqueante por IPC — Dispatchers.IO é necessário
  CoroutineScope(Dispatchers.IO).launch {
    try {
      val filePath = data.getString("filePath") ?: ""
      val printerQuality = if (data.hasKey("printerQuality")) data.getInt("printerQuality") else 4
      val steps = if (data.hasKey("steps")) data.getInt("steps") else 70
      val printerData = PlugPagPrinterData(filePath, printerQuality, steps)
      val result = plugPag.printFromFile(printerData)
      withContext(Dispatchers.Main) {
        if (result.result != PlugPag.RET_OK) {
          promise.reject("PLUGPAG_PRINT_ERROR", buildPrintErrorUserInfo(result))
        } else {
          val successMap = WritableNativeMap()
          successMap.putString("result", "ok")
          successMap.putInt("steps", result.steps)
          promise.resolve(successMap)
        }
      }
    } catch (e: Exception) {
      withContext(Dispatchers.Main) {
        promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
      }
    }
  }
}
```

---

## reprintCustomerReceipt

```kotlin
override fun reprintCustomerReceipt(promise: Promise) {
  // EXCEPTION (Constituição Princípio VI): SDK reprintCustomerReceipt é bloqueante por IPC — Dispatchers.IO é necessário
  CoroutineScope(Dispatchers.IO).launch {
    try {
      val result = plugPag.reprintCustomerReceipt()
      withContext(Dispatchers.Main) {
        if (result.result != PlugPag.RET_OK) {
          promise.reject("PLUGPAG_PRINT_ERROR", buildPrintErrorUserInfo(result))
        } else {
          val successMap = WritableNativeMap()
          successMap.putString("result", "ok")
          successMap.putInt("steps", result.steps)
          promise.resolve(successMap)
        }
      }
    } catch (e: Exception) {
      withContext(Dispatchers.Main) {
        promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
      }
    }
  }
}
```

---

## doAsyncReprintCustomerReceipt

```kotlin
override fun doAsyncReprintCustomerReceipt(promise: Promise) {
  try {
    plugPag.asyncReprintCustomerReceipt(object : PlugPagPrinterListener {
      override fun onSuccess(result: PlugPagPrintResult) {
        val successMap = WritableNativeMap()
        successMap.putString("result", "ok")
        successMap.putInt("steps", result.steps)
        promise.resolve(successMap)
      }
      override fun onError(result: PlugPagPrintResult) {
        promise.reject("PLUGPAG_PRINT_ERROR", buildPrintErrorUserInfo(result))
      }
    })
  } catch (e: Exception) {
    promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
  }
}
```

---

## reprintEstablishmentReceipt

```kotlin
override fun reprintEstablishmentReceipt(promise: Promise) {
  // EXCEPTION (Constituição Princípio VI): SDK reprintStablishmentReceipt é bloqueante por IPC — Dispatchers.IO é necessário
  CoroutineScope(Dispatchers.IO).launch {
    try {
      // "Stablishment" is the SDK's spelling — see FR-013
      val result = plugPag.reprintStablishmentReceipt()
      withContext(Dispatchers.Main) {
        if (result.result != PlugPag.RET_OK) {
          promise.reject("PLUGPAG_PRINT_ERROR", buildPrintErrorUserInfo(result))
        } else {
          val successMap = WritableNativeMap()
          successMap.putString("result", "ok")
          successMap.putInt("steps", result.steps)
          promise.resolve(successMap)
        }
      }
    } catch (e: Exception) {
      withContext(Dispatchers.Main) {
        promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
      }
    }
  }
}
```

---

## doAsyncReprintEstablishmentReceipt

```kotlin
override fun doAsyncReprintEstablishmentReceipt(promise: Promise) {
  try {
    plugPag.asyncReprintEstablishmentReceipt(object : PlugPagPrinterListener {
      override fun onSuccess(result: PlugPagPrintResult) {
        val successMap = WritableNativeMap()
        successMap.putString("result", "ok")
        successMap.putInt("steps", result.steps)
        promise.resolve(successMap)
      }
      override fun onError(result: PlugPagPrintResult) {
        promise.reject("PLUGPAG_PRINT_ERROR", buildPrintErrorUserInfo(result))
      }
    })
  } catch (e: Exception) {
    promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
  }
}
```
