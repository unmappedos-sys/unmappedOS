export type CopyKey =
  | 'boot.initializing'
  | 'boot.calibrating'
  | 'boot.ready'
  | 'offline.lost'
  | 'offline.localActive'
  | 'intel.degraded'
  | 'intel.proceedWithCaution'
  | 'city.header.city'
  | 'city.header.localTime'
  | 'city.header.status'
  | 'city.header.weather'
  | 'tpi.title'
  | 'tpi.touristPressure'
  | 'tpi.localActivity'
  | 'tpi.youWereRight'
  | 'tpi.areaOverpriced'
  | 'startHere.title'
  | 'startHere.zone'
  | 'startHere.anchor'
  | 'startHere.why'
  | 'startHere.navigate'
  | 'zone.lowPressure'
  | 'zone.proceedNormally'
  | 'zone.watch'
  | 'zone.stayAware'
  | 'zone.highPressure'
  | 'zone.considerExtract'
  | 'price.confirmed'
  | 'price.localRates'
  | 'price.overBaseline'
  | 'price.overBaselineDelta'
  | 'mission.complete'
  | 'mission.avoidedTouristZone'
  | 'mission.intelUpdated'
  | 'daily.title'
  | 'daily.zonesExplored'
  | 'daily.anchorsReached'
  | 'daily.overpaymentsAvoided'
  | 'share.localPriceVerified'
  | 'share.date';

export const COPY: Record<CopyKey, string> = {
  'boot.initializing': 'INITIALIZING LOCAL INTELLIGENCE',
  'boot.calibrating': 'CALIBRATING ENVIRONMENT',
  'boot.ready': 'STATUS: READY',

  'offline.lost': 'CONNECTION LOST',
  'offline.localActive': 'LOCAL INTELLIGENCE ACTIVE',

  'intel.degraded': 'INTEL DEGRADED',
  'intel.proceedWithCaution': 'PROCEED WITH CAUTION',

  'city.header.city': 'CITY',
  'city.header.localTime': 'LOCAL TIME',
  'city.header.status': 'STATUS',
  'city.header.weather': 'WEATHER',

  'tpi.title': 'TOURIST PRESSURE INDEX',
  'tpi.touristPressure': 'TOURIST PRESSURE',
  'tpi.localActivity': 'LOCAL ACTIVITY',
  'tpi.youWereRight': 'YOU WERE RIGHT',
  'tpi.areaOverpriced': 'THIS AREA IS OVERPRICED',

  'startHere.title': 'WHERE DO I GO FIRST?',
  'startHere.zone': 'ZONE',
  'startHere.anchor': 'ANCHOR',
  'startHere.why': 'WHY',
  'startHere.navigate': 'NAVIGATE TO ANCHOR',

  'zone.lowPressure': 'LOW PRESSURE ZONE',
  'zone.proceedNormally': 'PROCEED NORMALLY',
  'zone.watch': 'WATCH ZONE',
  'zone.stayAware': 'STAY AWARE',
  'zone.highPressure': 'HIGH PRESSURE ZONE',
  'zone.considerExtract': 'CONSIDER EXTRACT',

  'price.confirmed': 'CONFIRMED',
  'price.localRates': 'YOU PAID LOCAL RATES',
  'price.overBaseline': 'OVER LOCAL BASELINE',
  'price.overBaselineDelta': 'YOU PAID ~€{delta} MORE THAN AVERAGE',

  'mission.complete': 'MISSION COMPLETE',
  'mission.avoidedTouristZone': 'TOURIST ZONE AVOIDED',
  'mission.intelUpdated': 'INTEL UPDATED',

  'daily.title': 'TODAY IN {city}',
  'daily.zonesExplored': 'ZONES EXPLORED',
  'daily.anchorsReached': 'ANCHORS REACHED',
  'daily.overpaymentsAvoided': 'OVERPAYMENTS AVOIDED',

  'share.localPriceVerified': 'LOCAL PRICE VERIFIED',
  'share.date': 'DATE',
};

export function c(key: CopyKey, vars?: Record<string, string | number>): string {
  const template = COPY[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k] ?? ''));
}
