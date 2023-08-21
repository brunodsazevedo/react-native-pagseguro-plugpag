package com.pagseguroplugpag;

public class AppException extends Throwable {
  public AppException(String message) {
    super(message);
  }

  public AppException(String message, Throwable cause) {
    super(message, cause);
  }
}
