import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  initializeAndActivatePinPad(activationCode: string): Promise<Object>;
  doAsyncInitializeAndActivatePinPad(activationCode: string): Promise<Object>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('PagseguroPlugpag');
