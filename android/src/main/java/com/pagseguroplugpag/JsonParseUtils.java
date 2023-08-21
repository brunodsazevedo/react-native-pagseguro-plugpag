package com.pagseguroplugpag;

import android.util.Log;

import androidx.annotation.Nullable;

import org.json.JSONException;
import org.json.JSONObject;

import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagActivationData;
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentData;
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagVoidData;

public class JsonParseUtils {
  @Nullable
  public static PlugPagActivationData getPlugPagActivationDataFromJson(String jsonStr) {
    try {
      JSONObject object = new JSONObject(jsonStr);
      String activationCode = object.getString("activationCode");

      PlugPagActivationData activationData = new PlugPagActivationData(activationCode);
      Log.d("PlugPag Json Parse", "PlugPagActivationData parse success");

      return activationData;
    } catch (JSONException e) {
      Log.d("PlugPag Json Parse", "PlugPagActivationData parse error");
      return null;
    }
  }

  @Nullable
  public static PlugPagPaymentData getPlugPagPaymentDataFromJson(String jsonStr) {
    try {
      JSONObject object = new JSONObject(jsonStr);
      int amount = object.getInt("amount");
      int installmentType = object.getInt("installmentType");
      int installments = object.getInt("installments");
      int type = object.getInt("type");
      String userReference = object.getString("userReference");
      Boolean printReceipt = object.getBoolean("printReceipt");

      PlugPagPaymentData paymentData = new PlugPagPaymentData(type, amount, installmentType, installments, userReference, printReceipt);
      Log.d("PlugPag Json Parse", "PlugPagPaymentData parse success");

      return paymentData;
    } catch (JSONException e) {
      Log.d("PlugPag Json Parse", "PlugPagPaymentData parse error");
      return null;
    }
  }

  @Nullable
  public static PlugPagVoidData getPlugPagVoidDataFromJson(String jsonStr) {
    try {
      JSONObject object = new JSONObject(jsonStr);
      String transactionCode = object.getString("transactionCode");
      String transactionId = object.getString("transactionId");
      Boolean printReceipt = object.getBoolean("printReceipt");

      PlugPagVoidData voidPayment = new PlugPagVoidData(transactionCode, transactionId, printReceipt);
      Log.d("PlugPag Json Parse", "PlugPagVoidData parse success");

      return voidPayment;
    } catch (JSONException e) {
      Log.d("PlugPag Json Parse", "PlugPagVoidData parse error");
      return null;
    }
  }
}
