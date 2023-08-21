
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNPagseguroPlugpagSpec.h"

@interface PagseguroPlugpag : NSObject <NativePagseguroPlugpagSpec>
#else
#import <React/RCTBridgeModule.h>

@interface PagseguroPlugpag : NSObject <RCTBridgeModule>
#endif

@end
