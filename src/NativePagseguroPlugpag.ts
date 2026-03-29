import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  initializeAndActivatePinPad(activationCode: string): Promise<Object>;
  doAsyncInitializeAndActivatePinPad(activationCode: string): Promise<Object>;
  doPayment(data: Object): Promise<Object>;
  doAsyncPayment(data: Object): Promise<Object>;
  doRefund(data: Object): Promise<Object>;
  printFromFile(data: Object): Promise<Object>;
  reprintCustomerReceipt(): Promise<Object>;
  doAsyncReprintCustomerReceipt(): Promise<Object>;
  reprintEstablishmentReceipt(): Promise<Object>;
  doAsyncReprintEstablishmentReceipt(): Promise<Object>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('PagseguroPlugpag');
