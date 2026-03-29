/**
 * TurboModule Spec additions for Feature 006 — Custom Printing
 *
 * These 5 methods are added to src/NativePagseguroPlugpag.ts.
 * `Object` is required by React Native codegen for complex types.
 *
 * After updating NativePagseguroPlugpag.ts, run:
 *   cd example/android && ./gradlew generateCodegenArtifactsFromSchema
 */

// Addition to Spec interface in NativePagseguroPlugpag.ts:

// printFromFile(data: Object): Promise<Object>;
//   data shape: { filePath: string; printerQuality?: number; steps?: number }
//   resolves: { result: 'ok'; steps: number }

// reprintCustomerReceipt(): Promise<Object>;
//   resolves: { result: 'ok'; steps: number }

// doAsyncReprintCustomerReceipt(): Promise<Object>;
//   resolves: { result: 'ok'; steps: number }

// reprintEstablishmentReceipt(): Promise<Object>;
//   resolves: { result: 'ok'; steps: number }

// doAsyncReprintEstablishmentReceipt(): Promise<Object>;
//   resolves: { result: 'ok'; steps: number }
