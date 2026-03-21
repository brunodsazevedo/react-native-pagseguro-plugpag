package com.pagseguroplugpag

import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPag
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagAppIdentification
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagInitializationResult
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableNativeMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class PagseguroPlugpagModule(reactContext: ReactApplicationContext) :
  NativePagseguroPlugpagSpec(reactContext) {

  private val plugPag: PlugPag by lazy {
    val packageInfo = reactApplicationContext.packageManager
      .getPackageInfo(reactApplicationContext.packageName, 0)
    val versionName = packageInfo.versionName ?: "1.0"
    val appIdentification = PlugPagAppIdentification(
      reactApplicationContext.packageName,
      versionName
    )
    PlugPag(reactApplicationContext, appIdentification)
  }

  private fun buildSdkErrorUserInfo(sdkResult: PlugPagInitializationResult): WritableNativeMap {
    val map = WritableNativeMap()
    map.putInt("result", sdkResult.result)
    map.putString("errorCode", sdkResult.errorCode ?: "")
    map.putString(
      "message",
      sdkResult.errorMessage?.takeIf { it.isNotEmpty() } ?: "Unknown error"
    )
    return map
  }

  private fun buildInternalErrorUserInfo(e: Exception): WritableNativeMap {
    val map = WritableNativeMap()
    map.putInt("result", -1)
    map.putString("errorCode", "INTERNAL_ERROR")
    map.putString("message", e.message ?: "Unknown error")
    return map
  }

  override fun initializeAndActivatePinPad(activationCode: String, promise: Promise) {
    // EXCEPTION (Constituição Princípio VI): SDK initializeAndActivatePinpad é bloqueante por IPC — Dispatchers.IO é necessário
    CoroutineScope(Dispatchers.IO).launch {
      try {
        val activationData = PlugPagActivationData(activationCode)
        val result = plugPag.initializeAndActivatePinpad(activationData)
        withContext(Dispatchers.Main) {
          if (result.result != PlugPag.RET_OK) {
            promise.reject("PLUGPAG_INITIALIZATION_ERROR", buildSdkErrorUserInfo(result))
          } else {
            val successMap = WritableNativeMap()
            successMap.putString("result", "ok")
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

  override fun doAsyncInitializeAndActivatePinPad(activationCode: String, promise: Promise) {
    try {
      val activationData = PlugPagActivationData(activationCode)
      plugPag.doAsyncInitializeAndActivatePinpad(
        activationData,
        object : PlugPagActivationListener {
          override fun onActivationProgress(eventData: PlugPagEventData) {
            // Reserved for future progress event feature
          }

          override fun onSuccess(result: PlugPagInitializationResult) {
            val successMap = WritableNativeMap()
            successMap.putString("result", "ok")
            promise.resolve(successMap)
          }

          override fun onError(result: PlugPagInitializationResult) {
            promise.reject("PLUGPAG_INITIALIZATION_ERROR", buildSdkErrorUserInfo(result))
          }
        }
      )
    } catch (e: Exception) {
      promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
    }
  }

  companion object {
    const val NAME = NativePagseguroPlugpagSpec.NAME
  }
}
