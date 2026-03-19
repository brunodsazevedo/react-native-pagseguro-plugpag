package com.pagseguroplugpag

import com.facebook.react.bridge.ReactApplicationContext

class PagseguroPlugpagModule(reactContext: ReactApplicationContext) :
  NativePagseguroPlugpagSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativePagseguroPlugpagSpec.NAME
  }
}
