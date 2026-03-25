import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  initializeAndActivatePinPad(activationCode: string): Promise<Object>;
  doAsyncInitializeAndActivatePinPad(activationCode: string): Promise<Object>;
  doPayment(data: Object): Promise<Object>;
  doAsyncPayment(data: Object): Promise<Object>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('PagseguroPlugpag');
