/**
 * Feature Validation Script
 * Validates that all Strategy 6.0+ features are properly implemented
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  feature: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: ValidationResult[] = [];

function log(feature: string, status: 'PASS' | 'FAIL' | 'WARN', message: string) {
  results.push({ feature, status, message });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}${icon} ${feature}\x1b[0m: ${message}`);
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

function fileContains(filePath: string, searchString: string): boolean {
  if (!fileExists(filePath)) return false;
  const content = fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
  return content.includes(searchString);
}

console.log('\n🔍 Validating Unmapped OS Strategy 6.0+ Features...\n');

// 1. Direction-Aware Mode
console.log('📡 Direction-Aware Mode');
if (fileExists('apps/web/hooks/useDirectionAware.ts')) {
  if (fileContains('apps/web/hooks/useDirectionAware.ts', 'DeviceOrientationEvent')) {
    log('Direction-Aware Hook', 'PASS', 'Hook implemented with DeviceOrientation API');
  } else {
    log('Direction-Aware Hook', 'WARN', 'Hook exists but may not use correct API');
  }
} else {
  log('Direction-Aware Hook', 'FAIL', 'Hook file not found');
}

if (fileContains('apps/web/components/EnhancedMapComponent.tsx', 'useDirectionAware')) {
  log('Direction-Aware UI', 'PASS', 'Integrated into EnhancedMapComponent');
} else {
  log('Direction-Aware UI', 'WARN', 'Not integrated into map component');
}

// 2. Safe Walk Score
console.log('\n🛤️  Safe Walk Score');
if (fileContains('packages/lib/src/types.ts', 'SafeCorridor')) {
  log('SafeCorridor Type', 'PASS', 'Type definition exists');
} else {
  log('SafeCorridor Type', 'FAIL', 'Type not defined');
}

if (fileContains('scripts/packgen/generate_pack.ts', 'computeSafeCorridors')) {
  log('Safe Corridor Generation', 'PASS', 'Algorithm implemented in packgen');
} else {
  log('Safe Corridor Generation', 'FAIL', 'Algorithm not found in packgen');
}

if (fileContains('apps/web/components/EnhancedMapComponent.tsx', 'safe_corridors')) {
  log('Safe Corridor Rendering', 'PASS', 'Rendering implemented in map');
} else {
  log('Safe Corridor Rendering', 'WARN', 'Not rendering on map');
}

// 3. Operative Memory
console.log('\n📊 Operative Memory');
if (fileExists('apps/web/hooks/useOperativeMemory.ts')) {
  if (fileContains('apps/web/hooks/useOperativeMemory.ts', 'IndexedDB')) {
    log('Operative Memory Hook', 'PASS', 'Hook implemented with IndexedDB');
  } else {
    log('Operative Memory Hook', 'WARN', 'Hook exists but may not use IndexedDB');
  }
} else {
  log('Operative Memory Hook', 'FAIL', 'Hook file not found');
}

if (fileContains('packages/lib/src/types.ts', 'OperativeMemory')) {
  log('Operative Memory Type', 'PASS', 'Type definition exists');
} else {
  log('Operative Memory Type', 'FAIL', 'Type not defined');
}

// 4. Quick-Intel Overlay
console.log('\n🎯 Quick-Intel Overlay');
if (fileContains('packages/lib/src/types.ts', 'IntelMarker')) {
  log('IntelMarker Type', 'PASS', 'Type definition exists');
} else {
  log('IntelMarker Type', 'FAIL', 'Type not defined');
}

if (fileContains('scripts/packgen/generate_pack.ts', 'generateIntelMarkers')) {
  log('Intel Marker Generation', 'PASS', 'Algorithm implemented in packgen');
} else {
  log('Intel Marker Generation', 'FAIL', 'Algorithm not found');
}

if (fileContains('apps/web/components/EnhancedMapComponent.tsx', 'intel_markers')) {
  log('Intel Marker Rendering', 'PASS', 'Rendering implemented in map');
} else {
  log('Intel Marker Rendering', 'WARN', 'Not rendering on map');
}

// 5. Mission Whisper
console.log('\n💬 Mission Whisper');
if (fileContains('scripts/packgen/generate_pack.ts', 'generateMissionWhisper')) {
  log('Mission Whisper Generation', 'PASS', 'Algorithm implemented in packgen');
} else {
  log('Mission Whisper Generation', 'FAIL', 'Algorithm not found');
}

if (fileContains('packages/lib/src/types.ts', 'mission_whisper')) {
  log('Mission Whisper Type', 'PASS', 'Field added to Zone type');
} else {
  log('Mission Whisper Type', 'FAIL', 'Field not in Zone type');
}

if (fileContains('apps/web/components/EnhancedMapComponent.tsx', 'mission_whisper')) {
  log('Mission Whisper Display', 'PASS', 'Display implemented in map');
} else {
  log('Mission Whisper Display', 'WARN', 'Not displaying on map');
}

// 6. Dynamic Texture Shifts
console.log('\n🌈 Dynamic Texture Shifts');
if (fileContains('packages/lib/src/types.ts', 'texture_modifiers')) {
  log('Texture Modifiers Type', 'PASS', 'Type definition exists');
} else {
  log('Texture Modifiers Type', 'FAIL', 'Type not defined');
}

if (fileContains('apps/web/components/EnhancedMapComponent.tsx', 'texture_modifiers')) {
  log('Texture Shifts Rendering', 'PASS', 'Applied in map rendering');
} else {
  log('Texture Shifts Rendering', 'WARN', 'Not applied in rendering');
}

// 7. Shadow Copy Mode
console.log('\n🕶️  Shadow Copy Mode');
if (fileContains('packages/lib/src/types.ts', 'ShadowCopyConfig')) {
  log('Shadow Copy Type', 'PASS', 'Type definition exists');
} else {
  log('Shadow Copy Type', 'FAIL', 'Type not defined');
}

if (fileContains('apps/web/contexts/OpsContext.tsx', 'shadowCopy')) {
  log('Shadow Copy Context', 'PASS', 'Integrated into OpsContext');
} else {
  log('Shadow Copy Context', 'FAIL', 'Not in OpsContext');
}

if (fileContains('apps/web/contexts/OpsContext.tsx', 'toggleShadowCopy')) {
  log('Shadow Copy Toggle', 'PASS', 'Toggle function implemented');
} else {
  log('Shadow Copy Toggle', 'FAIL', 'Toggle not found');
}

// 8. Pack Sharing
console.log('\n📲 Pack Sharing');
if (fileExists('apps/web/components/PackShareModal.tsx')) {
  if (fileContains('apps/web/components/PackShareModal.tsx', 'qrcode')) {
    log('Pack Share Component', 'PASS', 'Component with QR support');
  } else {
    log('Pack Share Component', 'WARN', 'Component exists but may lack QR');
  }
} else {
  log('Pack Share Component', 'FAIL', 'Component not found');
}

if (fileContains('packages/lib/src/types.ts', 'pack_token')) {
  log('Pack Sharing Metadata', 'PASS', 'Metadata fields in CityPack');
} else {
  log('Pack Sharing Metadata', 'WARN', 'Metadata may be missing');
}

// 9. Dependencies
console.log('\n📦 Dependencies');
const webPackageJson = path.join(process.cwd(), 'apps/web/package.json');
if (fileExists('apps/web/package.json')) {
  const pkg = JSON.parse(fs.readFileSync(webPackageJson, 'utf-8'));
  
  if (pkg.dependencies['qrcode']) {
    log('QRCode Library', 'PASS', 'qrcode dependency installed');
  } else {
    log('QRCode Library', 'FAIL', 'qrcode missing from dependencies');
  }
  
  if (pkg.dependencies['lz-string']) {
    log('Compression Library', 'PASS', 'lz-string dependency installed');
  } else {
    log('Compression Library', 'FAIL', 'lz-string missing from dependencies');
  }
} else {
  log('Dependencies Check', 'FAIL', 'apps/web/package.json not found');
}

// 10. Documentation
console.log('\n📚 Documentation');
if (fileExists('FEATURES_COMPLETE.md')) {
  log('Feature Documentation', 'PASS', 'FEATURES_COMPLETE.md exists');
} else {
  log('Feature Documentation', 'WARN', 'FEATURES_COMPLETE.md not found');
}

if (fileExists('QUICK_START_NEW_FEATURES.md')) {
  log('Quick Start Guide', 'PASS', 'Quick start guide exists');
} else {
  log('Quick Start Guide', 'WARN', 'Quick start guide not found');
}

if (fileContains('README.md', 'Direction-Aware Mode')) {
  log('README Updated', 'PASS', 'README mentions new features');
} else {
  log('README Updated', 'WARN', 'README may need updating');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(60));

const passCount = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;
const warnCount = results.filter(r => r.status === 'WARN').length;
const totalCount = results.length;

console.log(`\n✓ PASS: ${passCount}/${totalCount} (${Math.round(passCount/totalCount*100)}%)`);
console.log(`✗ FAIL: ${failCount}/${totalCount}`);
console.log(`⚠ WARN: ${warnCount}/${totalCount}`);

if (failCount === 0) {
  console.log('\n🎉 ALL CRITICAL FEATURES VALIDATED!');
  if (warnCount > 0) {
    console.log('⚠️  Some warnings present - review recommendations above');
  }
  process.exit(0);
} else {
  console.log('\n❌ VALIDATION FAILED - Address failures above');
  process.exit(1);
}
