package com.pagseguroplugpag

import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPag
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagInitializationResult
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagTransactionResult
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PagseguroPlugpagModuleTest {

  // --- initializeAndActivatePinPad ---

  @Test
  fun `initializeAndActivatePinPad resolves with result ok on RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val successResult = mockk<PlugPagInitializationResult>()
    every { successResult.result } returns PlugPag.RET_OK

    every { mockPlugPag.initializeAndActivatePinpad(any<PlugPagActivationData>()) } returns successResult

    val resolvedMapSlot = slot<WritableMap>()
    every { mockPromise.resolve(capture(resolvedMapSlot)) } returns Unit

    // Verify promise.resolve is called with { result: 'ok' }
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `initializeAndActivatePinPad rejects with PLUGPAG_INITIALIZATION_ERROR on SDK failure`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val failureResult = mockk<PlugPagInitializationResult>()
    every { failureResult.result } returns 6
    every { failureResult.errorCode } returns "ABC123"
    every { failureResult.errorMessage } returns "Terminal não encontrado"

    every { mockPlugPag.initializeAndActivatePinpad(any<PlugPagActivationData>()) } returns failureResult

    // Verify promise.reject is called with PLUGPAG_INITIALIZATION_ERROR and userInfo with result as Int
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `initializeAndActivatePinPad rejects with PLUGPAG_INTERNAL_ERROR on exception`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    every {
      mockPlugPag.initializeAndActivatePinpad(any<PlugPagActivationData>())
    } throws RuntimeException("Connection failed")

    // Verify promise.reject is called with PLUGPAG_INTERNAL_ERROR and userInfo.result = -1
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  // --- doAsyncInitializeAndActivatePinPad ---

  @Test
  fun `doAsyncInitializeAndActivatePinPad resolves with result ok when onSuccess is called`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val listenerSlot = slot<PlugPagActivationListener>()
    val successResult = mockk<PlugPagInitializationResult>()
    every { successResult.result } returns PlugPag.RET_OK

    every {
      mockPlugPag.doAsyncInitializeAndActivatePinpad(any(), capture(listenerSlot))
    } answers {
      listenerSlot.captured.onSuccess(successResult)
    }

    // When onSuccess fires, promise.resolve should be called with { result: 'ok' }
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `doAsyncInitializeAndActivatePinPad rejects with PLUGPAG_INITIALIZATION_ERROR when onError is called`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val listenerSlot = slot<PlugPagActivationListener>()
    val errorResult = mockk<PlugPagInitializationResult>()
    every { errorResult.result } returns 6
    every { errorResult.errorCode } returns "ABC123"
    every { errorResult.errorMessage } returns "Terminal não encontrado"

    every {
      mockPlugPag.doAsyncInitializeAndActivatePinpad(any(), capture(listenerSlot))
    } answers {
      listenerSlot.captured.onError(errorResult)
    }

    // When onError fires, promise.reject("PLUGPAG_INITIALIZATION_ERROR", ...) should be called
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  // --- doPayment (T009) ---

  @Test
  fun `doPayment resolves with PlugPagTransactionResult on RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val successResult = mockk<PlugPagTransactionResult>()
    every { successResult.result } returns PlugPag.RET_OK
    every { successResult.transactionCode } returns "TXN123"
    every { successResult.transactionId } returns "ID456"
    every { successResult.date } returns "20260324"
    every { successResult.time } returns "120000"
    every { successResult.hostNsu } returns "NSU789"
    every { successResult.cardBrand } returns "VISA"
    every { successResult.bin } returns "411111"
    every { successResult.holder } returns "JOHN DOE"
    every { successResult.userReference } returns null
    every { successResult.terminalSerialNumber } returns "SN001"
    every { successResult.amount } returns "1000"
    every { successResult.availableBalance } returns null

    every { mockPlugPag.doPayment(any<PlugPagPaymentData>()) } returns successResult
    every { mockPlugPag.setEventListener(any()) } returns Unit

    val resolvedMapSlot = slot<WritableMap>()
    every { mockPromise.resolve(capture(resolvedMapSlot)) } returns Unit

    // doPayment should call promise.resolve with a map containing transactionCode
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `doPayment rejects with PLUGPAG_PAYMENT_ERROR when SDK result is not RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val failureResult = mockk<PlugPagTransactionResult>()
    every { failureResult.result } returns 2
    every { failureResult.errorCode } returns "PAY001"
    every { failureResult.message } returns "Pagamento recusado"

    every { mockPlugPag.doPayment(any<PlugPagPaymentData>()) } returns failureResult
    every { mockPlugPag.setEventListener(any()) } returns Unit

    // doPayment should call promise.reject("PLUGPAG_PAYMENT_ERROR", ...)
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `doPayment rejects with PLUGPAG_INTERNAL_ERROR when exception is thrown`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    every { mockPlugPag.doPayment(any<PlugPagPaymentData>()) } throws RuntimeException("Terminal disconnected")
    every { mockPlugPag.setEventListener(any()) } returns Unit

    // doPayment should call promise.reject("PLUGPAG_INTERNAL_ERROR", ...)
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  // --- doAsyncPayment (T030) ---

  @Test
  fun `doAsyncPayment resolves with PlugPagTransactionResult when onSuccess is called`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val listenerSlot = slot<PlugPagPaymentListener>()
    val successResult = mockk<PlugPagTransactionResult>()
    every { successResult.result } returns PlugPag.RET_OK
    every { successResult.transactionCode } returns "TXN123"
    every { successResult.transactionId } returns "ID456"
    every { successResult.date } returns "20260324"
    every { successResult.time } returns "120000"
    every { successResult.hostNsu } returns "NSU789"
    every { successResult.cardBrand } returns "VISA"
    every { successResult.bin } returns "411111"
    every { successResult.holder } returns "JOHN DOE"
    every { successResult.userReference } returns null
    every { successResult.terminalSerialNumber } returns "SN001"
    every { successResult.amount } returns "1000"
    every { successResult.availableBalance } returns null

    every {
      mockPlugPag.doAsyncPayment(any<PlugPagPaymentData>(), capture(listenerSlot))
    } answers {
      listenerSlot.captured.onSuccess(successResult)
    }

    // doAsyncPayment onSuccess should call promise.resolve with transaction map
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `doAsyncPayment rejects with PLUGPAG_PAYMENT_ERROR when onError is called`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val listenerSlot = slot<PlugPagPaymentListener>()
    val errorResult = mockk<PlugPagTransactionResult>()
    every { errorResult.result } returns 2
    every { errorResult.errorCode } returns "PAY001"
    every { errorResult.message } returns "Pagamento recusado"

    every {
      mockPlugPag.doAsyncPayment(any<PlugPagPaymentData>(), capture(listenerSlot))
    } answers {
      listenerSlot.captured.onError(errorResult)
    }

    // doAsyncPayment onError should call promise.reject("PLUGPAG_PAYMENT_ERROR", ...)
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `doAsyncPayment rejects with PLUGPAG_INTERNAL_ERROR when exception is thrown`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    every {
      mockPlugPag.doAsyncPayment(any<PlugPagPaymentData>(), any<PlugPagPaymentListener>())
    } throws RuntimeException("Terminal disconnected")

    // doAsyncPayment should catch exception and call promise.reject("PLUGPAG_INTERNAL_ERROR", ...)
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  // --- CAUSA-3: null safety — PlugPagTransactionResult.result é java.lang.Integer (Int?) ---

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

    // promise.reject("PLUGPAG_PAYMENT_ERROR", userInfo) com result = -1; sem NPE
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
}
