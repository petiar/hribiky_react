#import <GoogleMaps/GoogleMaps.h>

@interface GoogleMapsInitializer : NSObject
@end

@implementation GoogleMapsInitializer

+ (void)load {
    [GMSServices provideAPIKey:@"AIzaSyArY74Yt02J6fCnMEbIHpllfpN-D87OMtM"];
}

@end