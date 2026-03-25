package com.pagseguroplugpag

import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPag
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagAppIdentification
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagInitializationResult
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagTransactionResult
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule
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

  // --- Helpers for activation (feature/002) ---

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

  // --- Helpers for payment (feature/003) ---

  private fun buildTransactionResultMap(result: PlugPagTransactionResult): WritableNativeMap {
    val map = WritableNativeMap()
    fun putStringOrNull(key: String, value: String?) {
      if (value != null) map.putString(key, value) else map.putNull(key)
    }
    putStringOrNull("transactionCode", result.transactionCode)
    putStringOrNull("transactionId", result.transactionId)
    putStringOrNull("date", result.date)
    putStringOrNull("time", result.time)
    putStringOrNull("hostNsu", result.hostNsu)
    putStringOrNull("cardBrand", result.cardBrand)
    putStringOrNull("bin", result.bin)
    putStringOrNull("holder", result.holder)
    putStringOrNull("userReference", result.userReference)
    putStringOrNull("terminalSerialNumber", result.terminalSerialNumber)
    putStringOrNull("amount", result.amount)
    putStringOrNull("availableBalance", result.availableBalance)
    return map
  }

  private fun buildSdkPaymentErrorUserInfo(result: PlugPagTransactionResult): WritableNativeMap {
    val map = WritableNativeMap()
    map.putInt("result", result.result)
    map.putString("errorCode", result.errorCode ?: "")
    map.putString("message", result.message?.takeIf { it.isNotEmpty() } ?: "Unknown error")
    return map
  }

  private fun emitPaymentProgress(eventData: PlugPagEventData) {
    val params = Arguments.createMap()
    params.putInt("eventCode", eventData.eventCode)
    val msg = eventData.customMessage
    if (msg != null) params.putString("customMessage", msg) else params.putNull("customMessage")
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onPaymentProgress", params)
  }

  // --- NativeEventEmitter contract (feature/003) ---

  override fun addListener(eventName: String) {}

  override fun removeListeners(count: Double) {}

  // --- Activation methods (feature/002) ---

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

  // --- Payment methods (feature/003) ---

  override fun doPayment(data: ReadableMap, promise: Promise) {
    // EXCEPTION (Constituição Princípio VI): SDK doPayment é bloqueante por IPC — Dispatchers.IO é necessário
    CoroutineScope(Dispatchers.IO).launch {
      try {
        val type = when (data.getString("type")) {
          "CREDIT" -> PlugPag.TYPE_CREDITO
          "DEBIT" -> PlugPag.TYPE_DEBITO
          "PIX" -> PlugPag.TYPE_PIX
          else -> PlugPag.TYPE_CREDITO
        }
        val installmentType = when (data.getString("installmentType")) {
          "A_VISTA" -> PlugPag.INSTALLMENT_TYPE_A_VISTA
          "PARC_VENDEDOR" -> PlugPag.INSTALLMENT_TYPE_PARC_VENDEDOR
          "PARC_COMPRADOR" -> PlugPag.INSTALLMENT_TYPE_PARC_COMPRADOR
          else -> PlugPag.INSTALLMENT_TYPE_A_VISTA
        }
        val paymentData = PlugPagPaymentData(
          type = type,
          amount = data.getInt("amount"),
          installmentType = installmentType,
          installments = data.getInt("installments"),
          userReference = if (data.hasKey("userReference")) data.getString("userReference") else null,
          printReceipt = if (data.hasKey("printReceipt")) data.getBoolean("printReceipt") else false
        )

        plugPag.setEventListener(object : PlugPagEventListener {
          override fun onEvent(eventData: PlugPagEventData) {
            emitPaymentProgress(eventData)
          }
        })

        val result = plugPag.doPayment(paymentData)

        withContext(Dispatchers.Main) {
          if (result.result != PlugPag.RET_OK) {
            promise.reject("PLUGPAG_PAYMENT_ERROR", buildSdkPaymentErrorUserInfo(result))
          } else {
            promise.resolve(buildTransactionResultMap(result))
          }
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          promise.reject("PLUGPAG_INTERNAL_ERROR", buildInternalErrorUserInfo(e))
        }
      } finally {
        plugPag.setEventListener(object : PlugPagEventListener {
          override fun onEvent(eventData: PlugPagEventData) {}
        })
      }
    }
  }

  override fun doAsyncPayment(data: ReadableMap, promise: Promise) {
    try {
      val type = when (data.getString("type")) {
        "CREDIT" -> PlugPag.TYPE_CREDITO
        "DEBIT" -> PlugPag.TYPE_DEBITO
        "PIX" -> PlugPag.TYPE_PIX
        else -> PlugPag.TYPE_CREDITO
      }
      val installmentType = when (data.getString("installmentType")) {
        "A_VISTA" -> PlugPag.INSTALLMENT_TYPE_A_VISTA
        "PARC_VENDEDOR" -> PlugPag.INSTALLMENT_TYPE_PARC_VENDEDOR
        "PARC_COMPRADOR" -> PlugPag.INSTALLMENT_TYPE_PARC_COMPRADOR
        else -> PlugPag.INSTALLMENT_TYPE_A_VISTA
      }
      val paymentData = PlugPagPaymentData(
        type = type,
        amount = data.getInt("amount"),
        installmentType = installmentType,
        installments = data.getInt("installments"),
        userReference = if (data.hasKey("userReference")) data.getString("userReference") else null,
        printReceipt = if (data.hasKey("printReceipt")) data.getBoolean("printReceipt") else false
      )

      plugPag.doAsyncPayment(
        paymentData,
        object : PlugPagPaymentListener {
          override fun onSuccess(result: PlugPagTransactionResult) {
            promise.resolve(buildTransactionResultMap(result))
          }

          override fun onError(result: PlugPagTransactionResult) {
            promise.reject("PLUGPAG_PAYMENT_ERROR", buildSdkPaymentErrorUserInfo(result))
          }

          override fun onPaymentProgress(eventData: PlugPagEventData) {
            emitPaymentProgress(eventData)
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
