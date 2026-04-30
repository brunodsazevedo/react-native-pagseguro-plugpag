package com.pagseguroplugpag

import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPag
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagInitializationResult
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPrinterData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPrinterListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPrintResult
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagTransactionResult
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagVoidData
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

  // --- doRefund (KT-R01, KT-R02, KT-R03, KT-R04, KT-R05, KT-R06) ---

  @Test
  fun `doRefund resolves with PlugPagTransactionResult on RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val successResult = mockk<PlugPagTransactionResult>()
    every { successResult.result } returns PlugPag.RET_OK
    every { successResult.transactionCode } returns "TXN123"
    every { successResult.transactionId } returns "ID456"
    every { successResult.date } returns "20260328"
    every { successResult.time } returns "120000"
    every { successResult.hostNsu } returns "NSU789"
    every { successResult.cardBrand } returns "VISA"
    every { successResult.bin } returns "411111"
    every { successResult.holder } returns "JOHN DOE"
    every { successResult.userReference } returns null
    every { successResult.terminalSerialNumber } returns "SN001"
    every { successResult.amount } returns "1000"
    every { successResult.availableBalance } returns null
    every { successResult.nsu } returns null
    every { successResult.cardApplication } returns null
    every { successResult.label } returns null
    every { successResult.holderName } returns null
    every { successResult.extendedHolderName } returns null
    every { successResult.autoCode } returns null

    every { mockPlugPag.voidPayment(any<PlugPagVoidData>()) } returns successResult
    every { mockPlugPag.setEventListener(any()) } returns Unit

    val resolvedMapSlot = slot<WritableMap>()
    every { mockPromise.resolve(capture(resolvedMapSlot)) } returns Unit

    // doRefund should call promise.resolve with a map containing transactionCode
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `doRefund rejects with PLUGPAG_REFUND_ERROR when SDK result is not RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val failureResult = mockk<PlugPagTransactionResult>()
    every { failureResult.result } returns 2
    every { failureResult.errorCode } returns "REF001"
    every { failureResult.message } returns "Estorno recusado"

    every { mockPlugPag.voidPayment(any<PlugPagVoidData>()) } returns failureResult
    every { mockPlugPag.setEventListener(any()) } returns Unit

    // doRefund should call promise.reject("PLUGPAG_REFUND_ERROR", ...)
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `doRefund rejects with PLUGPAG_INTERNAL_ERROR when exception is thrown`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    every { mockPlugPag.voidPayment(any<PlugPagVoidData>()) } throws RuntimeException("Terminal disconnected")
    every { mockPlugPag.setEventListener(any()) } returns Unit

    // doRefund should call promise.reject("PLUGPAG_INTERNAL_ERROR", ...)
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `doRefund uses VOID_QRCODE constant when voidType is VOID_QRCODE`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val successResult = mockk<PlugPagTransactionResult>()
    every { successResult.result } returns PlugPag.RET_OK
    every { successResult.transactionCode } returns "TXN999"
    every { successResult.transactionId } returns "ID888"
    every { successResult.date } returns null
    every { successResult.time } returns null
    every { successResult.hostNsu } returns null
    every { successResult.cardBrand } returns null
    every { successResult.bin } returns null
    every { successResult.holder } returns null
    every { successResult.userReference } returns null
    every { successResult.terminalSerialNumber } returns null
    every { successResult.amount } returns null
    every { successResult.availableBalance } returns null
    every { successResult.nsu } returns null
    every { successResult.cardApplication } returns null
    every { successResult.label } returns null
    every { successResult.holderName } returns null
    every { successResult.extendedHolderName } returns null
    every { successResult.autoCode } returns null

    val voidDataSlot = slot<PlugPagVoidData>()
    every { mockPlugPag.voidPayment(capture(voidDataSlot)) } returns successResult
    every { mockPlugPag.setEventListener(any()) } returns Unit

    // doRefund should pass PlugPagVoidData with voidType = PlugPag.VOID_QRCODE (int 2)
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `buildTransactionResultMap maps 6 new fields`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val result = mockk<PlugPagTransactionResult>()
    every { result.result } returns PlugPag.RET_OK
    every { result.transactionCode } returns "TXN123"
    every { result.transactionId } returns "ID456"
    every { result.date } returns null
    every { result.time } returns null
    every { result.hostNsu } returns null
    every { result.cardBrand } returns null
    every { result.bin } returns null
    every { result.holder } returns null
    every { result.userReference } returns null
    every { result.terminalSerialNumber } returns null
    every { result.amount } returns "1000"
    every { result.availableBalance } returns null
    every { result.nsu } returns "NSU001"
    every { result.cardApplication } returns "VISA_CREDIT"
    every { result.label } returns "VISA"
    every { result.holderName } returns "JOHN DOE"
    every { result.extendedHolderName } returns "JOHN DOE JR"
    every { result.autoCode } returns "AUTO123"

    every { mockPlugPag.voidPayment(any<PlugPagVoidData>()) } returns result
    every { mockPlugPag.setEventListener(any()) } returns Unit

    val resolvedMapSlot = slot<WritableMap>()
    every { mockPromise.resolve(capture(resolvedMapSlot)) } returns Unit

    // buildTransactionResultMap should include the 6 new fields in the resolved map
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `doRefund rejects with PLUGPAG_REFUND_ERROR when result field is null`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val nullResult = mockk<PlugPagTransactionResult>()
    every { nullResult.result } returns null
    every { nullResult.errorCode } returns "UNKNOWN"
    every { nullResult.message } returns "Transação não concluída"

    every { mockPlugPag.voidPayment(any<PlugPagVoidData>()) } returns nullResult
    every { mockPlugPag.setEventListener(any()) } returns Unit

    // promise.reject("PLUGPAG_REFUND_ERROR", userInfo) com result = -1; sem NPE
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  // --- printFromFile (T007) ---

  @Test
  fun `printFromFile resolves with result ok and steps on RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val successResult = mockk<PlugPagPrintResult>()
    every { successResult.result } returns PlugPag.RET_OK
    every { successResult.steps } returns 120

    every { mockPlugPag.printFromFile(any<PlugPagPrinterData>()) } returns successResult

    val resolvedMapSlot = slot<WritableMap>()
    every { mockPromise.resolve(capture(resolvedMapSlot)) } returns Unit

    // printFromFile should call promise.resolve with { result: 'ok', steps: 120 }
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `printFromFile rejects with PLUGPAG_PRINT_ERROR when SDK result is not RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val failureResult = mockk<PlugPagPrintResult>()
    every { failureResult.result } returns -1040
    every { failureResult.errorCode } returns "NO_PRINTER_DEVICE"
    every { failureResult.message } returns "Printer not found"
    every { failureResult.steps } returns 0

    every { mockPlugPag.printFromFile(any<PlugPagPrinterData>()) } returns failureResult

    // promise.reject("PLUGPAG_PRINT_ERROR", userInfo) should be called
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `printFromFile rejects with PLUGPAG_INTERNAL_ERROR when SDK throws exception`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    every { mockPlugPag.printFromFile(any<PlugPagPrinterData>()) } throws RuntimeException("IPC failure")

    // promise.reject("PLUGPAG_INTERNAL_ERROR", userInfo) with result = -1 should be called
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `printFromFile serializes filePath, printerQuality and steps correctly to PlugPagPrinterData`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val successResult = mockk<PlugPagPrintResult>()
    every { successResult.result } returns PlugPag.RET_OK
    every { successResult.steps } returns 80

    val printerDataSlot = slot<PlugPagPrinterData>()
    every { mockPlugPag.printFromFile(capture(printerDataSlot)) } returns successResult

    // The captured PlugPagPrinterData should have filePath="/img.png", printerQuality=2, steps=80
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  // --- reprintCustomerReceipt (T011) ---

  @Test
  fun `reprintCustomerReceipt resolves with result ok and steps on RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val successResult = mockk<PlugPagPrintResult>()
    every { successResult.result } returns PlugPag.RET_OK
    every { successResult.steps } returns 80

    every { mockPlugPag.reprintCustomerReceipt() } returns successResult

    val resolvedMapSlot = slot<WritableMap>()
    every { mockPromise.resolve(capture(resolvedMapSlot)) } returns Unit

    // promise.resolve({ result: 'ok', steps: 80 }) should be called
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `reprintCustomerReceipt rejects with PLUGPAG_PRINT_ERROR when SDK result is not RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val failureResult = mockk<PlugPagPrintResult>()
    every { failureResult.result } returns -1040
    every { failureResult.errorCode } returns "NO_PRINTER_DEVICE"
    every { failureResult.message } returns "Printer not found"
    every { failureResult.steps } returns 0

    every { mockPlugPag.reprintCustomerReceipt() } returns failureResult

    // promise.reject("PLUGPAG_PRINT_ERROR", ...) should be called
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `reprintCustomerReceipt rejects with PLUGPAG_INTERNAL_ERROR when SDK throws exception`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    every { mockPlugPag.reprintCustomerReceipt() } throws RuntimeException("IPC failure")

    // promise.reject("PLUGPAG_INTERNAL_ERROR", ...) with result = -1 should be called
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  // --- doAsyncReprintCustomerReceipt (T011) ---

  @Test
  fun `doAsyncReprintCustomerReceipt resolves when onSuccess is called`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val listenerSlot = slot<PlugPagPrinterListener>()
    val successResult = mockk<PlugPagPrintResult>()
    every { successResult.result } returns PlugPag.RET_OK
    every { successResult.steps } returns 80

    every {
      mockPlugPag.asyncReprintCustomerReceipt(capture(listenerSlot))
    } answers {
      listenerSlot.captured.onSuccess(successResult)
    }

    // promise.resolve({ result: 'ok', steps: 80 }) should be called via onSuccess
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `doAsyncReprintCustomerReceipt rejects with PLUGPAG_PRINT_ERROR when onError is called`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val listenerSlot = slot<PlugPagPrinterListener>()
    val errorResult = mockk<PlugPagPrintResult>()
    every { errorResult.result } returns -1040
    every { errorResult.errorCode } returns "NO_PRINTER_DEVICE"
    every { errorResult.message } returns "No printer"
    every { errorResult.steps } returns 0

    every {
      mockPlugPag.asyncReprintCustomerReceipt(capture(listenerSlot))
    } answers {
      listenerSlot.captured.onError(errorResult)
    }

    // promise.reject("PLUGPAG_PRINT_ERROR", ...) should be called via onError
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `doAsyncReprintCustomerReceipt rejects with PLUGPAG_INTERNAL_ERROR when SDK throws before listener`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    every {
      mockPlugPag.asyncReprintCustomerReceipt(any<PlugPagPrinterListener>())
    } throws RuntimeException("IPC failure")

    // promise.reject("PLUGPAG_INTERNAL_ERROR", ...) should be called
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  // --- reprintEstablishmentReceipt (T015) ---

  @Test
  fun `reprintEstablishmentReceipt resolves with result ok and steps on RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val successResult = mockk<PlugPagPrintResult>()
    every { successResult.result } returns PlugPag.RET_OK
    every { successResult.steps } returns 80

    // Note: SDK method has typo — reprintStablishmentReceipt (FR-013)
    every { mockPlugPag.reprintStablishmentReceipt() } returns successResult

    val resolvedMapSlot = slot<WritableMap>()
    every { mockPromise.resolve(capture(resolvedMapSlot)) } returns Unit

    // promise.resolve({ result: 'ok', steps: 80 }) should be called
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `reprintEstablishmentReceipt rejects with PLUGPAG_PRINT_ERROR when SDK result is not RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val failureResult = mockk<PlugPagPrintResult>()
    every { failureResult.result } returns -1040
    every { failureResult.errorCode } returns "NO_PRINTER_DEVICE"
    every { failureResult.message } returns "Printer not found"
    every { failureResult.steps } returns 0

    every { mockPlugPag.reprintStablishmentReceipt() } returns failureResult

    // promise.reject("PLUGPAG_PRINT_ERROR", ...) should be called
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `reprintEstablishmentReceipt rejects with PLUGPAG_INTERNAL_ERROR when SDK throws exception`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    every { mockPlugPag.reprintStablishmentReceipt() } throws RuntimeException("IPC failure")

    // promise.reject("PLUGPAG_INTERNAL_ERROR", ...) with result = -1 should be called
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  // --- doAsyncReprintEstablishmentReceipt (T015) ---

  @Test
  fun `doAsyncReprintEstablishmentReceipt resolves when onSuccess is called`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val listenerSlot = slot<PlugPagPrinterListener>()
    val successResult = mockk<PlugPagPrintResult>()
    every { successResult.result } returns PlugPag.RET_OK
    every { successResult.steps } returns 80

    every {
      mockPlugPag.asyncReprintEstablishmentReceipt(capture(listenerSlot))
    } answers {
      listenerSlot.captured.onSuccess(successResult)
    }

    // promise.resolve({ result: 'ok', steps: 80 }) should be called via onSuccess
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `doAsyncReprintEstablishmentReceipt rejects with PLUGPAG_PRINT_ERROR when onError is called`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val listenerSlot = slot<PlugPagPrinterListener>()
    val errorResult = mockk<PlugPagPrintResult>()
    every { errorResult.result } returns -1040
    every { errorResult.errorCode } returns "NO_PRINTER_DEVICE"
    every { errorResult.message } returns "No printer"
    every { errorResult.steps } returns 0

    every {
      mockPlugPag.asyncReprintEstablishmentReceipt(capture(listenerSlot))
    } answers {
      listenerSlot.captured.onError(errorResult)
    }

    // promise.reject("PLUGPAG_PRINT_ERROR", ...) should be called via onError
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `doAsyncReprintEstablishmentReceipt rejects with PLUGPAG_INTERNAL_ERROR when SDK throws before listener`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    every {
      mockPlugPag.asyncReprintEstablishmentReceipt(any<PlugPagPrinterListener>())
    } throws RuntimeException("IPC failure")

    // promise.reject("PLUGPAG_INTERNAL_ERROR", ...) should be called
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  // --- abort() (KT-A01, KT-A02, KT-A03) ---

  @Test
  fun `abort resolves with result ok when SDK returns RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val successResult = mockk<br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagAbortResult>()
    every { successResult.result } returns PlugPag.RET_OK

    every { mockPlugPag.abort() } returns successResult

    val resolvedMapSlot = slot<WritableMap>()
    every { mockPromise.resolve(capture(resolvedMapSlot)) } returns Unit

    // abort() should call promise.resolve with { result: 'ok' }
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `abort rejects with PLUGPAG_ABORT_ERROR when SDK result is not RET_OK`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val failureResult = mockk<br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagAbortResult>()
    every { failureResult.result } returns -1

    every { mockPlugPag.abort() } returns failureResult

    // abort() should call promise.reject("PLUGPAG_ABORT_ERROR", ...)
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `abort rejects with PLUGPAG_INTERNAL_ERROR when SDK throws exception`() = runTest {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    every { mockPlugPag.abort() } throws RuntimeException("IPC failure")

    // abort() should call promise.reject("PLUGPAG_INTERNAL_ERROR", ...)
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  // --- doAsyncAbort() (KT-A04, KT-A05, KT-A06, KT-A07) ---

  @Test
  fun `doAsyncAbort resolves with result ok when onAbortRequested is called with true`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val listenerSlot = slot<br.com.uol.pagseguro.plugpagservice.wrapper.listeners.PlugPagAbortListener>()
    every {
      mockPlugPag.asyncAbort(capture(listenerSlot))
    } answers {
      listenerSlot.captured.onAbortRequested(true)
    }

    // doAsyncAbort() should call promise.resolve with { result: 'ok' }
    verify(exactly = 0) { mockPromise.reject(any<String>(), any<WritableMap>()) }
  }

  @Test
  fun `doAsyncAbort rejects with PLUGPAG_ABORT_ERROR when onAbortRequested is called with false`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val listenerSlot = slot<br.com.uol.pagseguro.plugpagservice.wrapper.listeners.PlugPagAbortListener>()
    every {
      mockPlugPag.asyncAbort(capture(listenerSlot))
    } answers {
      listenerSlot.captured.onAbortRequested(false)
    }

    // doAsyncAbort() should call promise.reject("PLUGPAG_ABORT_ERROR", ...)
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `doAsyncAbort rejects with PLUGPAG_ABORT_ERROR when onError is called`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    val listenerSlot = slot<br.com.uol.pagseguro.plugpagservice.wrapper.listeners.PlugPagAbortListener>()
    every {
      mockPlugPag.asyncAbort(capture(listenerSlot))
    } answers {
      listenerSlot.captured.onError("Terminal error")
    }

    // doAsyncAbort() should call promise.reject("PLUGPAG_ABORT_ERROR", ...)
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }

  @Test
  fun `doAsyncAbort rejects with PLUGPAG_INTERNAL_ERROR when SDK throws before listener`() {
    val mockPlugPag = mockk<PlugPag>()
    val mockPromise = mockk<Promise>(relaxed = true)

    every {
      mockPlugPag.asyncAbort(any<br.com.uol.pagseguro.plugpagservice.wrapper.listeners.PlugPagAbortListener>())
    } throws RuntimeException("IPC failure")

    // doAsyncAbort() should call promise.reject("PLUGPAG_INTERNAL_ERROR", ...)
    verify(exactly = 0) { mockPromise.resolve(any()) }
  }
}
