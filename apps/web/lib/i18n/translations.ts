// Multi-language translations for Unmapped OS
export type Language = 'en' | 'th' | 'ja' | 'es' | 'zh' | 'fr' | 'de' | 'ko' | 'pt' | 'ru' | 'ar' | 'hi' | 'it' | 'nl' | 'tr' | 'vi' | 'id' | 'pl';

export interface Translations {
  // Navigation & System
  home: string;
  operative: string;
  signIn: string;
  signOut: string;
  loading: string;
  error: string;
  back: string;
  
  // Boot sequence
  systemBooting: string;
  systemOperational: string;
  allModulesGreen: string;
  initializingMap: string;
  loadingBlackBox: string;
  calibratingGPS: string;
  
  // Mission & Status
  mission: string;
  missionBrief: string;
  tacticalDisplay: string;
  abortMission: string;
  gpsModule: string;
  opsNetwork: string;
  ghostMode: string;
  ghostModeActive: string;
  ghostModeDisengaged: string;
  
  // Map & Zones
  zonesLoaded: string;
  zoneStatus: string;
  zoneLocked: string;
  anchorPoint: string;
  recalibrateGPS: string;
  expandHud: string;
  collapseHud: string;
  reportHazard: string;
  exportToMaps: string;
  
  // City Pack
  cityPackAvailable: string;
  downloadCityPack: string;
  blackBoxAcquired: string;
  blackBoxNotFound: string;
  acquireBlackBox: string;
  packSize: string;
  offlineCapable: string;
  
  // Intel & Data
  priceIntel: string;
  localComms: string;
  tactiPhone: string;
  emergency: string;
  police: string;
  ambulance: string;
  embassy: string;
  
  // User & Account
  operativeProfile: string;
  karma: string;
  missionsCompleted: string;
  zonesExplored: string;
  dataPoints: string;
  joinedDate: string;
  
  // Actions
  deploy: string;
  download: string;
  cancel: string;
  confirm: string;
  submit: string;
  continue: string;
  
  // Descriptions
  appDescription: string;
  ghostModeDescription: string;
  offlineDescription: string;
  
  // Status
  active: string;
  offline: string;
  online: string;
  blackBox: string;
  caution: string;
  critical: string;
  
  // Languages (for language selector)
  language: string;
  selectLanguage: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    home: 'Home',
    operative: 'Operative',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    loading: 'Loading',
    error: 'Error',
    back: 'Back',
    
    systemBooting: 'System Booting',
    systemOperational: 'System Operational',
    allModulesGreen: 'All Modules Green',
    initializingMap: 'Initializing Map Engine',
    loadingBlackBox: 'Loading Black Box Data',
    calibratingGPS: 'Calibrating GPS Module',
    
    mission: 'Mission',
    missionBrief: 'Mission Brief',
    tacticalDisplay: 'Tactical Display',
    abortMission: 'Abort Mission',
    gpsModule: 'GPS Module',
    opsNetwork: 'Ops Network',
    ghostMode: 'Ghost Mode',
    ghostModeActive: 'Active',
    ghostModeDisengaged: 'Disengaged',
    
    zonesLoaded: 'Zones Loaded',
    zoneStatus: 'Zone Status',
    zoneLocked: 'Zone Locked',
    anchorPoint: 'Anchor Point',
    recalibrateGPS: 'Recalibrate GPS',
    expandHud: 'Expand HUD',
    collapseHud: 'Collapse HUD',
    reportHazard: 'Report Hazard',
    exportToMaps: 'Export to Maps',
    
    cityPackAvailable: 'City Pack Available',
    downloadCityPack: 'Download City Pack',
    blackBoxAcquired: 'Black Box Acquired',
    blackBoxNotFound: 'Black Box Not Found',
    acquireBlackBox: 'Acquire Black Box',
    packSize: 'Pack Size',
    offlineCapable: 'Offline Capable',
    
    priceIntel: 'Price Intel',
    localComms: 'Local Comms',
    tactiPhone: 'Tacti-Phone',
    emergency: 'Emergency',
    police: 'Police',
    ambulance: 'Ambulance',
    embassy: 'Embassy',
    
    operativeProfile: 'Operative Profile',
    karma: 'Karma',
    missionsCompleted: 'Missions Completed',
    zonesExplored: 'Zones Explored',
    dataPoints: 'Data Points',
    joinedDate: 'Joined',
    
    deploy: 'Deploy',
    download: 'Download',
    cancel: 'Cancel',
    confirm: 'Confirm',
    submit: 'Submit',
    continue: 'Continue',
    
    appDescription: 'Military-grade offline intelligence for urban field operations',
    ghostModeDescription: 'Reduces screen glow and simplifies visuals for tactical environments',
    offlineDescription: 'All data available offline after download',
    
    active: 'Active',
    offline: 'Offline',
    online: 'Online',
    blackBox: 'Black Box',
    caution: 'Caution',
    critical: 'Critical',
    
    language: 'Language',
    selectLanguage: 'Select Language',
  },
  
  th: {
    home: 'หน้าแรก',
    operative: 'เจ้าหน้าที่',
    signIn: 'เข้าสู่ระบบ',
    signOut: 'ออกจากระบบ',
    loading: 'กำลังโหลด',
    error: 'ข้อผิดพลาด',
    back: 'กลับ',
    
    systemBooting: 'กำลังเริ่มระบบ',
    systemOperational: 'ระบบพร้อมใช้งาน',
    allModulesGreen: 'ทุกโมดูลพร้อม',
    initializingMap: 'กำลังเริ่มระบบแผนที่',
    loadingBlackBox: 'กำลังโหลดข้อมูลแบล็กบ็อกซ์',
    calibratingGPS: 'กำลังปรับจูน GPS',
    
    mission: 'ภารกิจ',
    missionBrief: 'สรุปภารกิจ',
    tacticalDisplay: 'การแสดงผลเชิงกลยุทธ์',
    abortMission: 'ยกเลิกภารกิจ',
    gpsModule: 'โมดูล GPS',
    opsNetwork: 'เครือข่ายปฏิบัติการ',
    ghostMode: 'โหมดซ่อนตัว',
    ghostModeActive: 'เปิดใช้งาน',
    ghostModeDisengaged: 'ปิดใช้งาน',
    
    zonesLoaded: 'โซนที่โหลดแล้ว',
    zoneStatus: 'สถานะโซน',
    zoneLocked: 'ล็อคโซนแล้ว',
    anchorPoint: 'จุดยึด',
    recalibrateGPS: 'ปรับจูน GPS ใหม่',
    expandHud: 'ขยาย HUD',
    collapseHud: 'ย่อ HUD',
    reportHazard: 'รายงานภัย',
    exportToMaps: 'ส่งออกไปแผนที่',
    
    cityPackAvailable: 'แพ็คเมืองพร้อมใช้',
    downloadCityPack: 'ดาวน์โหลดแพ็คเมือง',
    blackBoxAcquired: 'ได้รับแบล็กบ็อกซ์แล้ว',
    blackBoxNotFound: 'ไม่พบแบล็กบ็อกซ์',
    acquireBlackBox: 'รับแบล็กบ็อกซ์',
    packSize: 'ขนาดแพ็ค',
    offlineCapable: 'ใช้งานออฟไลน์ได้',
    
    priceIntel: 'ข้อมูลราคา',
    localComms: 'การสื่อสารท้องถิ่น',
    tactiPhone: 'แท็กติโฟน',
    emergency: 'ฉุกเฉิน',
    police: 'ตำรวจ',
    ambulance: 'รถพยาบาล',
    embassy: 'สถานทูต',
    
    operativeProfile: 'โปรไฟล์เจ้าหน้าที่',
    karma: 'คาร์มา',
    missionsCompleted: 'ภารกิจที่เสร็จสิ้น',
    zonesExplored: 'โซนที่สำรวจ',
    dataPoints: 'จุดข้อมูล',
    joinedDate: 'เข้าร่วมเมื่อ',
    
    deploy: 'ปรับใช้',
    download: 'ดาวน์โหลด',
    cancel: 'ยกเลิก',
    confirm: 'ยืนยัน',
    submit: 'ส่ง',
    continue: 'ดำเนินการต่อ',
    
    appDescription: 'ข่าวกรองออฟไลน์ระดับทหารสำหรับปฏิบัติการในเมือง',
    ghostModeDescription: 'ลดความสว่างหน้าจอและทำให้ภาพง่ายขึ้นเพื่อสภาพแวดล้อมเชิงกลยุทธ์',
    offlineDescription: 'ข้อมูลทั้งหมดใช้ได้ออฟไลน์หลังดาวน์โหลด',
    
    active: 'ใช้งาน',
    offline: 'ออฟไลน์',
    online: 'ออนไลน์',
    blackBox: 'แบล็กบ็อกซ์',
    caution: 'ระวัง',
    critical: 'วิกฤต',
    
    language: 'ภาษา',
    selectLanguage: 'เลือกภาษา',
  },
  
  ja: {
    home: 'ホーム',
    operative: 'オペレーティブ',
    signIn: 'サインイン',
    signOut: 'サインアウト',
    loading: '読み込み中',
    error: 'エラー',
    back: '戻る',
    
    systemBooting: 'システム起動中',
    systemOperational: 'システム稼働中',
    allModulesGreen: '全モジュール正常',
    initializingMap: 'マップエンジン初期化中',
    loadingBlackBox: 'ブラックボックスデータ読み込み中',
    calibratingGPS: 'GPS較正中',
    
    mission: 'ミッション',
    missionBrief: 'ミッション概要',
    tacticalDisplay: 'タクティカルディスプレイ',
    abortMission: 'ミッション中止',
    gpsModule: 'GPSモジュール',
    opsNetwork: '作戦ネットワーク',
    ghostMode: 'ゴーストモード',
    ghostModeActive: 'アクティブ',
    ghostModeDisengaged: '非アクティブ',
    
    zonesLoaded: 'ゾーン読み込み済み',
    zoneStatus: 'ゾーンステータス',
    zoneLocked: 'ゾーンロック済み',
    anchorPoint: 'アンカーポイント',
    recalibrateGPS: 'GPS再較正',
    expandHud: 'HUD展開',
    collapseHud: 'HUD折りたたみ',
    reportHazard: 'ハザード報告',
    exportToMaps: 'マップにエクスポート',
    
    cityPackAvailable: '都市パック利用可能',
    downloadCityPack: '都市パックダウンロード',
    blackBoxAcquired: 'ブラックボックス取得済み',
    blackBoxNotFound: 'ブラックボックスが見つかりません',
    acquireBlackBox: 'ブラックボックス取得',
    packSize: 'パックサイズ',
    offlineCapable: 'オフライン対応',
    
    priceIntel: '価格情報',
    localComms: 'ローカル通信',
    tactiPhone: 'タクティフォン',
    emergency: '緊急',
    police: '警察',
    ambulance: '救急車',
    embassy: '大使館',
    
    operativeProfile: 'オペレーティブプロファイル',
    karma: 'カルマ',
    missionsCompleted: '完了ミッション',
    zonesExplored: '探索ゾーン',
    dataPoints: 'データポイント',
    joinedDate: '参加日',
    
    deploy: '展開',
    download: 'ダウンロード',
    cancel: 'キャンセル',
    confirm: '確認',
    submit: '送信',
    continue: '続ける',
    
    appDescription: '都市フィールド作戦のための軍用グレードオフラインインテリジェンス',
    ghostModeDescription: '戦術環境のために画面の輝度を下げ、ビジュアルを簡素化します',
    offlineDescription: 'ダウンロード後、すべてのデータがオフラインで利用可能',
    
    active: 'アクティブ',
    offline: 'オフライン',
    online: 'オンライン',
    blackBox: 'ブラックボックス',
    caution: '注意',
    critical: '重大',
    
    language: '言語',
    selectLanguage: '言語を選択',
  },
  
  es: {
    home: 'Inicio',
    operative: 'Operativo',
    signIn: 'Iniciar Sesión',
    signOut: 'Cerrar Sesión',
    loading: 'Cargando',
    error: 'Error',
    back: 'Atrás',
    
    systemBooting: 'Iniciando Sistema',
    systemOperational: 'Sistema Operacional',
    allModulesGreen: 'Todos los Módulos Verdes',
    initializingMap: 'Inicializando Motor de Mapas',
    loadingBlackBox: 'Cargando Datos de Caja Negra',
    calibratingGPS: 'Calibrando Módulo GPS',
    
    mission: 'Misión',
    missionBrief: 'Resumen de Misión',
    tacticalDisplay: 'Pantalla Táctica',
    abortMission: 'Abortar Misión',
    gpsModule: 'Módulo GPS',
    opsNetwork: 'Red de Operaciones',
    ghostMode: 'Modo Fantasma',
    ghostModeActive: 'Activo',
    ghostModeDisengaged: 'Desactivado',
    
    zonesLoaded: 'Zonas Cargadas',
    zoneStatus: 'Estado de Zona',
    zoneLocked: 'Zona Bloqueada',
    anchorPoint: 'Punto de Anclaje',
    recalibrateGPS: 'Recalibrar GPS',
    expandHud: 'Expandir HUD',
    collapseHud: 'Contraer HUD',
    reportHazard: 'Reportar Peligro',
    exportToMaps: 'Exportar a Mapas',
    
    cityPackAvailable: 'Paquete de Ciudad Disponible',
    downloadCityPack: 'Descargar Paquete de Ciudad',
    blackBoxAcquired: 'Caja Negra Adquirida',
    blackBoxNotFound: 'Caja Negra No Encontrada',
    acquireBlackBox: 'Adquirir Caja Negra',
    packSize: 'Tamaño del Paquete',
    offlineCapable: 'Capaz sin Conexión',
    
    priceIntel: 'Inteligencia de Precios',
    localComms: 'Comunicaciones Locales',
    tactiPhone: 'Tacti-Teléfono',
    emergency: 'Emergencia',
    police: 'Policía',
    ambulance: 'Ambulancia',
    embassy: 'Embajada',
    
    operativeProfile: 'Perfil Operativo',
    karma: 'Karma',
    missionsCompleted: 'Misiones Completadas',
    zonesExplored: 'Zonas Exploradas',
    dataPoints: 'Puntos de Datos',
    joinedDate: 'Unido',
    
    deploy: 'Desplegar',
    download: 'Descargar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    submit: 'Enviar',
    continue: 'Continuar',
    
    appDescription: 'Inteligencia offline de grado militar para operaciones de campo urbano',
    ghostModeDescription: 'Reduce el brillo de pantalla y simplifica visuales para entornos tácticos',
    offlineDescription: 'Todos los datos disponibles sin conexión después de descargar',
    
    active: 'Activo',
    offline: 'Sin Conexión',
    online: 'En Línea',
    blackBox: 'Caja Negra',
    caution: 'Precaución',
    critical: 'Crítico',
    
    language: 'Idioma',
    selectLanguage: 'Seleccionar Idioma',
  },
  
  zh: {
    home: '主页',
    operative: '操作员',
    signIn: '登录',
    signOut: '登出',
    loading: '加载中',
    error: '错误',
    back: '返回',
    
    systemBooting: '系统启动中',
    systemOperational: '系统运行中',
    allModulesGreen: '所有模块正常',
    initializingMap: '初始化地图引擎',
    loadingBlackBox: '加载黑匣子数据',
    calibratingGPS: '校准GPS模块',
    
    mission: '任务',
    missionBrief: '任务简报',
    tacticalDisplay: '战术显示',
    abortMission: '中止任务',
    gpsModule: 'GPS模块',
    opsNetwork: '作战网络',
    ghostMode: '幽灵模式',
    ghostModeActive: '激活',
    ghostModeDisengaged: '未激活',
    
    zonesLoaded: '已加载区域',
    zoneStatus: '区域状态',
    zoneLocked: '区域已锁定',
    anchorPoint: '锚点',
    recalibrateGPS: '重新校准GPS',
    expandHud: '展开HUD',
    collapseHud: '折叠HUD',
    reportHazard: '报告危险',
    exportToMaps: '导出到地图',
    
    cityPackAvailable: '城市包可用',
    downloadCityPack: '下载城市包',
    blackBoxAcquired: '已获得黑匣子',
    blackBoxNotFound: '未找到黑匣子',
    acquireBlackBox: '获取黑匣子',
    packSize: '包大小',
    offlineCapable: '支持离线',
    
    priceIntel: '价格情报',
    localComms: '本地通讯',
    tactiPhone: '战术电话',
    emergency: '紧急',
    police: '警察',
    ambulance: '救护车',
    embassy: '大使馆',
    
    operativeProfile: '操作员档案',
    karma: '业力',
    missionsCompleted: '已完成任务',
    zonesExplored: '已探索区域',
    dataPoints: '数据点',
    joinedDate: '加入日期',
    
    deploy: '部署',
    download: '下载',
    cancel: '取消',
    confirm: '确认',
    submit: '提交',
    continue: '继续',
    
    appDescription: '城市野外作战的军用级离线情报',
    ghostModeDescription: '降低屏幕亮度并简化视觉效果以适应战术环境',
    offlineDescription: '下载后所有数据可离线使用',
    
    active: '活跃',
    offline: '离线',
    online: '在线',
    blackBox: '黑匣子',
    caution: '警告',
    critical: '危急',
    
    language: '语言',
    selectLanguage: '选择语言',
  },
  
  fr: {
    home: 'Accueil',
    operative: 'Opératif',
    signIn: 'Se Connecter',
    signOut: 'Se Déconnecter',
    loading: 'Chargement',
    error: 'Erreur',
    back: 'Retour',
    
    systemBooting: 'Démarrage du Système',
    systemOperational: 'Système Opérationnel',
    allModulesGreen: 'Tous les Modules Verts',
    initializingMap: 'Initialisation du Moteur de Carte',
    loadingBlackBox: 'Chargement des Données de Boîte Noire',
    calibratingGPS: 'Calibrage du Module GPS',
    
    mission: 'Mission',
    missionBrief: 'Briefing de Mission',
    tacticalDisplay: 'Affichage Tactique',
    abortMission: 'Abandonner la Mission',
    gpsModule: 'Module GPS',
    opsNetwork: 'Réseau d\'Opérations',
    ghostMode: 'Mode Fantôme',
    ghostModeActive: 'Actif',
    ghostModeDisengaged: 'Désactivé',
    
    zonesLoaded: 'Zones Chargées',
    zoneStatus: 'Statut de Zone',
    zoneLocked: 'Zone Verrouillée',
    anchorPoint: 'Point d\'Ancrage',
    recalibrateGPS: 'Recalibrer GPS',
    expandHud: 'Étendre HUD',
    collapseHud: 'Réduire HUD',
    reportHazard: 'Signaler un Danger',
    exportToMaps: 'Exporter vers Cartes',
    
    cityPackAvailable: 'Pack Ville Disponible',
    downloadCityPack: 'Télécharger Pack Ville',
    blackBoxAcquired: 'Boîte Noire Acquise',
    blackBoxNotFound: 'Boîte Noire Non Trouvée',
    acquireBlackBox: 'Acquérir Boîte Noire',
    packSize: 'Taille du Pack',
    offlineCapable: 'Capable Hors Ligne',
    
    priceIntel: 'Renseignements sur les Prix',
    localComms: 'Communications Locales',
    tactiPhone: 'Tacti-Téléphone',
    emergency: 'Urgence',
    police: 'Police',
    ambulance: 'Ambulance',
    embassy: 'Ambassade',
    
    operativeProfile: 'Profil Opératif',
    karma: 'Karma',
    missionsCompleted: 'Missions Terminées',
    zonesExplored: 'Zones Explorées',
    dataPoints: 'Points de Données',
    joinedDate: 'Rejoint',
    
    deploy: 'Déployer',
    download: 'Télécharger',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    submit: 'Soumettre',
    continue: 'Continuer',
    
    appDescription: 'Renseignements hors ligne de qualité militaire pour opérations de terrain urbain',
    ghostModeDescription: 'Réduit la luminosité de l\'écran et simplifie les visuels pour environnements tactiques',
    offlineDescription: 'Toutes les données disponibles hors ligne après téléchargement',
    
    active: 'Actif',
    offline: 'Hors Ligne',
    online: 'En Ligne',
    blackBox: 'Boîte Noire',
    caution: 'Attention',
    critical: 'Critique',
    
    language: 'Langue',
    selectLanguage: 'Sélectionner la Langue',
  },
  
  de: {
    home: 'Startseite',
    operative: 'Operative',
    signIn: 'Anmelden',
    signOut: 'Abmelden',
    loading: 'Wird geladen',
    error: 'Fehler',
    back: 'Zurück',
    
    systemBooting: 'System startet',
    systemOperational: 'System betriebsbereit',
    allModulesGreen: 'Alle Module Grün',
    initializingMap: 'Karten-Engine wird initialisiert',
    loadingBlackBox: 'Black-Box-Daten werden geladen',
    calibratingGPS: 'GPS-Modul wird kalibriert',
    
    mission: 'Mission',
    missionBrief: 'Missions-Briefing',
    tacticalDisplay: 'Taktische Anzeige',
    abortMission: 'Mission abbrechen',
    gpsModule: 'GPS-Modul',
    opsNetwork: 'Ops-Netzwerk',
    ghostMode: 'Geist-Modus',
    ghostModeActive: 'Aktiv',
    ghostModeDisengaged: 'Deaktiviert',
    
    zonesLoaded: 'Zonen geladen',
    zoneStatus: 'Zonenstatus',
    zoneLocked: 'Zone gesperrt',
    anchorPoint: 'Ankerpunkt',
    recalibrateGPS: 'GPS neu kalibrieren',
    expandHud: 'HUD erweitern',
    collapseHud: 'HUD reduzieren',
    reportHazard: 'Gefahr melden',
    exportToMaps: 'Zu Karten exportieren',
    
    cityPackAvailable: 'Stadtpaket verfügbar',
    downloadCityPack: 'Stadtpaket herunterladen',
    blackBoxAcquired: 'Black Box erworben',
    blackBoxNotFound: 'Black Box nicht gefunden',
    acquireBlackBox: 'Black Box erwerben',
    packSize: 'Paketgröße',
    offlineCapable: 'Offline-fähig',
    
    priceIntel: 'Preisinformationen',
    localComms: 'Lokale Kommunikation',
    tactiPhone: 'Takt-Telefon',
    emergency: 'Notfall',
    police: 'Polizei',
    ambulance: 'Krankenwagen',
    embassy: 'Botschaft',
    
    operativeProfile: 'Operatives Profil',
    karma: 'Karma',
    missionsCompleted: 'Abgeschlossene Missionen',
    zonesExplored: 'Erkundete Zonen',
    dataPoints: 'Datenpunkte',
    joinedDate: 'Beigetreten',
    
    deploy: 'Bereitstellen',
    download: 'Herunterladen',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    submit: 'Senden',
    continue: 'Fortfahren',
    
    appDescription: 'Militärische Offline-Intelligence für urbane Feldeinsätze',
    ghostModeDescription: 'Reduziert Bildschirmhelligkeit und vereinfacht Visuals für taktische Umgebungen',
    offlineDescription: 'Alle Daten nach dem Herunterladen offline verfügbar',
    
    active: 'Aktiv',
    offline: 'Offline',
    online: 'Online',
    blackBox: 'Black Box',
    caution: 'Vorsicht',
    critical: 'Kritisch',
    
    language: 'Sprache',
    selectLanguage: 'Sprache auswählen',
  },
  
  ko: {
    home: '홈',
    operative: '작전자',
    signIn: '로그인',
    signOut: '로그아웃',
    loading: '로딩 중',
    error: '오류',
    back: '뒤로',
    
    systemBooting: '시스템 부팅 중',
    systemOperational: '시스템 작동 중',
    allModulesGreen: '모든 모듈 정상',
    initializingMap: '맵 엔진 초기화 중',
    loadingBlackBox: '블랙박스 데이터 로딩 중',
    calibratingGPS: 'GPS 모듈 보정 중',
    
    mission: '임무',
    missionBrief: '임무 브리핑',
    tacticalDisplay: '전술 디스플레이',
    abortMission: '임무 중단',
    gpsModule: 'GPS 모듈',
    opsNetwork: '작전 네트워크',
    ghostMode: '고스트 모드',
    ghostModeActive: '활성',
    ghostModeDisengaged: '비활성',
    
    zonesLoaded: '로드된 구역',
    zoneStatus: '구역 상태',
    zoneLocked: '구역 잠금',
    anchorPoint: '앵커 포인트',
    recalibrateGPS: 'GPS 재보정',
    expandHud: 'HUD 확장',
    collapseHud: 'HUD 축소',
    reportHazard: '위험 보고',
    exportToMaps: '지도로 내보내기',
    
    cityPackAvailable: '도시 팩 사용 가능',
    downloadCityPack: '도시 팩 다운로드',
    blackBoxAcquired: '블랙박스 획득',
    blackBoxNotFound: '블랙박스를 찾을 수 없음',
    acquireBlackBox: '블랙박스 획득',
    packSize: '팩 크기',
    offlineCapable: '오프라인 가능',
    
    priceIntel: '가격 정보',
    localComms: '지역 통신',
    tactiPhone: '전술 전화',
    emergency: '긴급',
    police: '경찰',
    ambulance: '구급차',
    embassy: '대사관',
    
    operativeProfile: '작전자 프로필',
    karma: '카르마',
    missionsCompleted: '완료된 임무',
    zonesExplored: '탐색한 구역',
    dataPoints: '데이터 포인트',
    joinedDate: '가입 날짜',
    
    deploy: '배치',
    download: '다운로드',
    cancel: '취소',
    confirm: '확인',
    submit: '제출',
    continue: '계속',
    
    appDescription: '도시 야전 작전을 위한 군사급 오프라인 정보',
    ghostModeDescription: '전술 환경을 위해 화면 밝기를 낮추고 비주얼을 단순화합니다',
    offlineDescription: '다운로드 후 모든 데이터를 오프라인에서 사용 가능',
    
    active: '활성',
    offline: '오프라인',
    online: '온라인',
    blackBox: '블랙박스',
    caution: '주의',
    critical: '위급',
    
    language: '언어',
    selectLanguage: '언어 선택',
  },
  
  pt: {
    home: 'Início',
    operative: 'Operativo',
    signIn: 'Entrar',
    signOut: 'Sair',
    loading: 'Carregando',
    error: 'Erro',
    back: 'Voltar',
    
    systemBooting: 'Sistema Inicializando',
    systemOperational: 'Sistema Operacional',
    allModulesGreen: 'Todos os Módulos Verdes',
    initializingMap: 'Inicializando Motor de Mapa',
    loadingBlackBox: 'Carregando Dados da Caixa Preta',
    calibratingGPS: 'Calibrando Módulo GPS',
    
    mission: 'Missão',
    missionBrief: 'Briefing da Missão',
    tacticalDisplay: 'Display Tático',
    abortMission: 'Abortar Missão',
    gpsModule: 'Módulo GPS',
    opsNetwork: 'Rede de Operações',
    ghostMode: 'Modo Fantasma',
    ghostModeActive: 'Ativo',
    ghostModeDisengaged: 'Desativado',
    
    zonesLoaded: 'Zonas Carregadas',
    zoneStatus: 'Status da Zona',
    zoneLocked: 'Zona Bloqueada',
    anchorPoint: 'Ponto de Ancoragem',
    recalibrateGPS: 'Recalibrar GPS',
    expandHud: 'Expandir HUD',
    collapseHud: 'Recolher HUD',
    reportHazard: 'Relatar Perigo',
    exportToMaps: 'Exportar para Mapas',
    
    cityPackAvailable: 'Pacote de Cidade Disponível',
    downloadCityPack: 'Baixar Pacote de Cidade',
    blackBoxAcquired: 'Caixa Preta Adquirida',
    blackBoxNotFound: 'Caixa Preta Não Encontrada',
    acquireBlackBox: 'Adquirir Caixa Preta',
    packSize: 'Tamanho do Pacote',
    offlineCapable: 'Capaz Offline',
    
    priceIntel: 'Inteligência de Preços',
    localComms: 'Comunicações Locais',
    tactiPhone: 'Tacti-Telefone',
    emergency: 'Emergência',
    police: 'Polícia',
    ambulance: 'Ambulância',
    embassy: 'Embaixada',
    
    operativeProfile: 'Perfil Operativo',
    karma: 'Karma',
    missionsCompleted: 'Missões Concluídas',
    zonesExplored: 'Zonas Exploradas',
    dataPoints: 'Pontos de Dados',
    joinedDate: 'Entrou em',
    
    deploy: 'Implementar',
    download: 'Baixar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    submit: 'Enviar',
    continue: 'Continuar',
    
    appDescription: 'Inteligência offline de grau militar para operações de campo urbano',
    ghostModeDescription: 'Reduz o brilho da tela e simplifica visuais para ambientes táticos',
    offlineDescription: 'Todos os dados disponíveis offline após o download',
    
    active: 'Ativo',
    offline: 'Offline',
    online: 'Online',
    blackBox: 'Caixa Preta',
    caution: 'Atenção',
    critical: 'Crítico',
    
    language: 'Idioma',
    selectLanguage: 'Selecionar Idioma',
  },
  
  ru: {
    home: 'Главная',
    operative: 'Оперативник',
    signIn: 'Войти',
    signOut: 'Выйти',
    loading: 'Загрузка',
    error: 'Ошибка',
    back: 'Назад',
    
    systemBooting: 'Загрузка системы',
    systemOperational: 'Система работает',
    allModulesGreen: 'Все модули в норме',
    initializingMap: 'Инициализация движка карты',
    loadingBlackBox: 'Загрузка данных черного ящика',
    calibratingGPS: 'Калибровка GPS модуля',
    
    mission: 'Миссия',
    missionBrief: 'Сводка миссии',
    tacticalDisplay: 'Тактический дисплей',
    abortMission: 'Прервать миссию',
    gpsModule: 'GPS модуль',
    opsNetwork: 'Оперативная сеть',
    ghostMode: 'Режим призрака',
    ghostModeActive: 'Активен',
    ghostModeDisengaged: 'Выключен',
    
    zonesLoaded: 'Загружено зон',
    zoneStatus: 'Статус зоны',
    zoneLocked: 'Зона заблокирована',
    anchorPoint: 'Точка привязки',
    recalibrateGPS: 'Перекалибровать GPS',
    expandHud: 'Развернуть HUD',
    collapseHud: 'Свернуть HUD',
    reportHazard: 'Сообщить об опасности',
    exportToMaps: 'Экспорт в карты',
    
    cityPackAvailable: 'Городской пакет доступен',
    downloadCityPack: 'Скачать городской пакет',
    blackBoxAcquired: 'Черный ящик получен',
    blackBoxNotFound: 'Черный ящик не найден',
    acquireBlackBox: 'Получить черный ящик',
    packSize: 'Размер пакета',
    offlineCapable: 'Работает офлайн',
    
    priceIntel: 'Информация о ценах',
    localComms: 'Местная связь',
    tactiPhone: 'Такти-телефон',
    emergency: 'Экстренная служба',
    police: 'Полиция',
    ambulance: 'Скорая помощь',
    embassy: 'Посольство',
    
    operativeProfile: 'Профиль оперативника',
    karma: 'Карма',
    missionsCompleted: 'Выполнено миссий',
    zonesExplored: 'Исследовано зон',
    dataPoints: 'Точки данных',
    joinedDate: 'Присоединился',
    
    deploy: 'Развернуть',
    download: 'Скачать',
    cancel: 'Отменить',
    confirm: 'Подтвердить',
    submit: 'Отправить',
    continue: 'Продолжить',
    
    appDescription: 'Военная офлайн-разведка для городских полевых операций',
    ghostModeDescription: 'Уменьшает яркость экрана и упрощает визуальные эффекты для тактических условий',
    offlineDescription: 'Все данные доступны офлайн после загрузки',
    
    active: 'Активен',
    offline: 'Офлайн',
    online: 'Онлайн',
    blackBox: 'Черный ящик',
    caution: 'Осторожно',
    critical: 'Критично',
    
    language: 'Язык',
    selectLanguage: 'Выбрать язык',
  },
  
  ar: {
    home: 'الرئيسية',
    operative: 'العميل',
    signIn: 'تسجيل الدخول',
    signOut: 'تسجيل الخروج',
    loading: 'جار التحميل',
    error: 'خطأ',
    back: 'رجوع',
    
    systemBooting: 'تمهيد النظام',
    systemOperational: 'النظام جاهز',
    allModulesGreen: 'جميع الوحدات جاهزة',
    initializingMap: 'تهيئة الخريطة',
    loadingBlackBox: 'تحميل بيانات الصندوق الأسود',
    calibratingGPS: 'معايرة نظام تحديد المواقع',
    
    mission: 'المهمة',
    missionBrief: 'ملخص المهمة',
    tacticalDisplay: 'العرض التكتيكي',
    abortMission: 'إلغاء المهمة',
    gpsModule: 'وحدة تحديد المواقع',
    opsNetwork: 'شبكة العمليات',
    ghostMode: 'وضع الشبح',
    ghostModeActive: 'نشط',
    ghostModeDisengaged: 'غير نشط',
    
    zonesLoaded: 'المناطق المحملة',
    zoneStatus: 'حالة المنطقة',
    zoneLocked: 'المنطقة مقفلة',
    anchorPoint: 'نقطة الإرساء',
    recalibrateGPS: 'إعادة معايرة تحديد المواقع',
    expandHud: 'توسيع الواجهة',
    collapseHud: 'طي الواجهة',
    reportHazard: 'الإبلاغ عن خطر',
    exportToMaps: 'تصدير إلى الخرائط',
    
    cityPackAvailable: 'حزمة المدينة متوفرة',
    downloadCityPack: 'تحميل حزمة المدينة',
    blackBoxAcquired: 'تم الحصول على الصندوق الأسود',
    blackBoxNotFound: 'لم يتم العثور على الصندوق الأسود',
    acquireBlackBox: 'الحصول على الصندوق الأسود',
    packSize: 'حجم الحزمة',
    offlineCapable: 'قابل للاستخدام دون اتصال',
    
    priceIntel: 'معلومات الأسعار',
    localComms: 'الاتصالات المحلية',
    tactiPhone: 'الهاتف التكتيكي',
    emergency: 'طوارئ',
    police: 'الشرطة',
    ambulance: 'الإسعاف',
    embassy: 'السفارة',
    
    operativeProfile: 'ملف العميل',
    karma: 'الكارما',
    missionsCompleted: 'المهام المنجزة',
    zonesExplored: 'المناطق المستكشفة',
    dataPoints: 'نقاط البيانات',
    joinedDate: 'تاريخ الانضمام',
    
    deploy: 'نشر',
    download: 'تحميل',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    submit: 'إرسال',
    continue: 'متابعة',
    
    appDescription: 'خرائط تكتيكية غير متصلة بالإنترنت للعمليات الحضرية',
    ghostModeDescription: 'يقلل من سطوع الشاشة ويوفر البطارية',
    offlineDescription: 'يعمل بدون اتصال بالإنترنت باستخدام بيانات الصندوق الأسود',
    
    active: 'نشط',
    offline: 'غير متصل',
    online: 'متصل',
    blackBox: 'الصندوق الأسود',
    caution: 'تحذير',
    critical: 'حرج',
    
    language: 'اللغة',
    selectLanguage: 'اختر اللغة',
  },
  
  hi: {
    home: 'होम',
    operative: 'ऑपरेटिव',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    loading: 'लोड हो रहा है',
    error: 'त्रुटि',
    back: 'वापस',
    
    systemBooting: 'सिस्टम बूट हो रहा है',
    systemOperational: 'सिस्टम चालू है',
    allModulesGreen: 'सभी मॉड्यूल तैयार हैं',
    initializingMap: 'मैप शुरू हो रहा है',
    loadingBlackBox: 'ब्लैक बॉक्स डेटा लोड हो रहा है',
    calibratingGPS: 'GPS कैलिब्रेट हो रहा है',
    
    mission: 'मिशन',
    missionBrief: 'मिशन ब्रीफ',
    tacticalDisplay: 'टैक्टिकल डिस्प्ले',
    abortMission: 'मिशन रद्द करें',
    gpsModule: 'GPS मॉड्यूल',
    opsNetwork: 'ऑप्स नेटवर्क',
    ghostMode: 'घोस्ट मोड',
    ghostModeActive: 'सक्रिय',
    ghostModeDisengaged: 'निष्क्रिय',
    
    zonesLoaded: 'ज़ोन लोड हुए',
    zoneStatus: 'ज़ोन स्थिति',
    zoneLocked: 'ज़ोन लॉक हुआ',
    anchorPoint: 'एंकर पॉइंट',
    recalibrateGPS: 'GPS पुनः कैलिब्रेट करें',
    expandHud: 'HUD विस्तृत करें',
    collapseHud: 'HUD संक्षिप्त करें',
    reportHazard: 'खतरे की रिपोर्ट करें',
    exportToMaps: 'मैप्स में निर्यात करें',
    
    cityPackAvailable: 'सिटी पैक उपलब्ध है',
    downloadCityPack: 'सिटी पैक डाउनलोड करें',
    blackBoxAcquired: 'ब्लैक बॉक्स प्राप्त किया',
    blackBoxNotFound: 'ब्लैक बॉक्स नहीं मिला',
    acquireBlackBox: 'ब्लैक बॉक्स प्राप्त करें',
    packSize: 'पैक आकार',
    offlineCapable: 'ऑफ़लाइन सक्षम',
    
    priceIntel: 'कीमत जानकारी',
    localComms: 'स्थानीय संचार',
    tactiPhone: 'टैक्टी-फोन',
    emergency: 'आपातकाल',
    police: 'पुलिस',
    ambulance: 'एम्बुलेंस',
    embassy: 'दूतावास',
    
    operativeProfile: 'ऑपरेटिव प्रोफ़ाइल',
    karma: 'कर्म',
    missionsCompleted: 'पूर्ण मिशन',
    zonesExplored: 'खोजे गए ज़ोन',
    dataPoints: 'डेटा पॉइंट्स',
    joinedDate: 'शामिल होने की तारीख',
    
    deploy: 'तैनात करें',
    download: 'डाउनलोड',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    submit: 'सबमिट करें',
    continue: 'जारी रखें',
    
    appDescription: 'शहरी संचालन के लिए ऑफ़लाइन टैक्टिकल मैप्स',
    ghostModeDescription: 'स्क्रीन चमक कम करता है और बैटरी बचाता है',
    offlineDescription: 'ब्लैक बॉक्स डेटा के साथ ऑफ़लाइन काम करता है',
    
    active: 'सक्रिय',
    offline: 'ऑफ़लाइन',
    online: 'ऑनलाइन',
    blackBox: 'ब्लैक बॉक्स',
    caution: 'सावधानी',
    critical: 'गंभीर',
    
    language: 'भाषा',
    selectLanguage: 'भाषा चुनें',
  },
  
  it: {
    home: 'Home',
    operative: 'Operativo',
    signIn: 'Accedi',
    signOut: 'Disconnetti',
    loading: 'Caricamento',
    error: 'Errore',
    back: 'Indietro',
    
    systemBooting: 'Avvio Sistema',
    systemOperational: 'Sistema Operativo',
    allModulesGreen: 'Tutti i Moduli OK',
    initializingMap: 'Inizializzazione Mappa',
    loadingBlackBox: 'Caricamento Dati Black Box',
    calibratingGPS: 'Calibrazione GPS',
    
    mission: 'Missione',
    missionBrief: 'Briefing Missione',
    tacticalDisplay: 'Display Tattico',
    abortMission: 'Annulla Missione',
    gpsModule: 'Modulo GPS',
    opsNetwork: 'Rete Ops',
    ghostMode: 'Modalità Fantasma',
    ghostModeActive: 'Attivo',
    ghostModeDisengaged: 'Disattivato',
    
    zonesLoaded: 'Zone Caricate',
    zoneStatus: 'Stato Zona',
    zoneLocked: 'Zona Bloccata',
    anchorPoint: 'Punto di Ancoraggio',
    recalibrateGPS: 'Ricalibrare GPS',
    expandHud: 'Espandi HUD',
    collapseHud: 'Comprimi HUD',
    reportHazard: 'Segnala Pericolo',
    exportToMaps: 'Esporta su Mappe',
    
    cityPackAvailable: 'Pacchetto Città Disponibile',
    downloadCityPack: 'Scarica Pacchetto Città',
    blackBoxAcquired: 'Black Box Acquisita',
    blackBoxNotFound: 'Black Box Non Trovata',
    acquireBlackBox: 'Acquisisci Black Box',
    packSize: 'Dimensione Pacchetto',
    offlineCapable: 'Funziona Offline',
    
    priceIntel: 'Info Prezzi',
    localComms: 'Comunicazioni Locali',
    tactiPhone: 'Tacti-Phone',
    emergency: 'Emergenza',
    police: 'Polizia',
    ambulance: 'Ambulanza',
    embassy: 'Ambasciata',
    
    operativeProfile: 'Profilo Operativo',
    karma: 'Karma',
    missionsCompleted: 'Missioni Completate',
    zonesExplored: 'Zone Esplorate',
    dataPoints: 'Punti Dati',
    joinedDate: 'Data Iscrizione',
    
    deploy: 'Distribuisci',
    download: 'Scarica',
    cancel: 'Annulla',
    confirm: 'Conferma',
    submit: 'Invia',
    continue: 'Continua',
    
    appDescription: 'Mappe tattiche offline per operazioni urbane',
    ghostModeDescription: 'Riduce la luminosità dello schermo e risparmia batteria',
    offlineDescription: 'Funziona offline con dati Black Box',
    
    active: 'Attivo',
    offline: 'Offline',
    online: 'Online',
    blackBox: 'Black Box',
    caution: 'Attenzione',
    critical: 'Critico',
    
    language: 'Lingua',
    selectLanguage: 'Seleziona Lingua',
  },
  
  nl: {
    home: 'Home',
    operative: 'Operatief',
    signIn: 'Inloggen',
    signOut: 'Uitloggen',
    loading: 'Laden',
    error: 'Fout',
    back: 'Terug',
    
    systemBooting: 'Systeem Opstarten',
    systemOperational: 'Systeem Operationeel',
    allModulesGreen: 'Alle Modules OK',
    initializingMap: 'Kaart Initialiseren',
    loadingBlackBox: 'Black Box Data Laden',
    calibratingGPS: 'GPS Kalibreren',
    
    mission: 'Missie',
    missionBrief: 'Missie Briefing',
    tacticalDisplay: 'Tactisch Display',
    abortMission: 'Missie Afbreken',
    gpsModule: 'GPS Module',
    opsNetwork: 'Ops Netwerk',
    ghostMode: 'Spookmodus',
    ghostModeActive: 'Actief',
    ghostModeDisengaged: 'Uitgeschakeld',
    
    zonesLoaded: 'Zones Geladen',
    zoneStatus: 'Zone Status',
    zoneLocked: 'Zone Vergrendeld',
    anchorPoint: 'Ankerpunt',
    recalibrateGPS: 'GPS Herkalibreren',
    expandHud: 'HUD Uitvouwen',
    collapseHud: 'HUD Samenvouwen',
    reportHazard: 'Gevaar Melden',
    exportToMaps: 'Exporteren naar Kaarten',
    
    cityPackAvailable: 'Stadspakket Beschikbaar',
    downloadCityPack: 'Stadspakket Downloaden',
    blackBoxAcquired: 'Black Box Verkregen',
    blackBoxNotFound: 'Black Box Niet Gevonden',
    acquireBlackBox: 'Black Box Verkrijgen',
    packSize: 'Pakketgrootte',
    offlineCapable: 'Offline Beschikbaar',
    
    priceIntel: 'Prijs Info',
    localComms: 'Lokale Communicatie',
    tactiPhone: 'Tacti-Telefoon',
    emergency: 'Noodgeval',
    police: 'Politie',
    ambulance: 'Ambulance',
    embassy: 'Ambassade',
    
    operativeProfile: 'Operatief Profiel',
    karma: 'Karma',
    missionsCompleted: 'Voltooide Missies',
    zonesExplored: 'Verkende Zones',
    dataPoints: 'Datapunten',
    joinedDate: 'Lid Sinds',
    
    deploy: 'Inzetten',
    download: 'Downloaden',
    cancel: 'Annuleren',
    confirm: 'Bevestigen',
    submit: 'Verzenden',
    continue: 'Doorgaan',
    
    appDescription: 'Offline tactische kaarten voor stedelijke operaties',
    ghostModeDescription: 'Vermindert schermhelderheid en bespaart batterij',
    offlineDescription: 'Werkt offline met Black Box data',
    
    active: 'Actief',
    offline: 'Offline',
    online: 'Online',
    blackBox: 'Black Box',
    caution: 'Voorzichtig',
    critical: 'Kritiek',
    
    language: 'Taal',
    selectLanguage: 'Selecteer Taal',
  },
  
  tr: {
    home: 'Ana Sayfa',
    operative: 'Operatif',
    signIn: 'Giriş Yap',
    signOut: 'Çıkış Yap',
    loading: 'Yükleniyor',
    error: 'Hata',
    back: 'Geri',
    
    systemBooting: 'Sistem Başlatılıyor',
    systemOperational: 'Sistem Çalışıyor',
    allModulesGreen: 'Tüm Modüller Hazır',
    initializingMap: 'Harita Başlatılıyor',
    loadingBlackBox: 'Kara Kutu Verisi Yükleniyor',
    calibratingGPS: 'GPS Kalibre Ediliyor',
    
    mission: 'Görev',
    missionBrief: 'Görev Özeti',
    tacticalDisplay: 'Taktik Ekran',
    abortMission: 'Görevi İptal Et',
    gpsModule: 'GPS Modülü',
    opsNetwork: 'Ops Ağı',
    ghostMode: 'Hayalet Modu',
    ghostModeActive: 'Aktif',
    ghostModeDisengaged: 'Devre Dışı',
    
    zonesLoaded: 'Bölgeler Yüklendi',
    zoneStatus: 'Bölge Durumu',
    zoneLocked: 'Bölge Kilitli',
    anchorPoint: 'Sabitleme Noktası',
    recalibrateGPS: 'GPS\'i Yeniden Kalibre Et',
    expandHud: 'HUD\'u Genişlet',
    collapseHud: 'HUD\'u Daralt',
    reportHazard: 'Tehlike Bildir',
    exportToMaps: 'Haritalara Aktar',
    
    cityPackAvailable: 'Şehir Paketi Mevcut',
    downloadCityPack: 'Şehir Paketini İndir',
    blackBoxAcquired: 'Kara Kutu Alındı',
    blackBoxNotFound: 'Kara Kutu Bulunamadı',
    acquireBlackBox: 'Kara Kutuyu Al',
    packSize: 'Paket Boyutu',
    offlineCapable: 'Çevrimdışı Kullanılabilir',
    
    priceIntel: 'Fiyat Bilgisi',
    localComms: 'Yerel İletişim',
    tactiPhone: 'Takti-Telefon',
    emergency: 'Acil Durum',
    police: 'Polis',
    ambulance: 'Ambulans',
    embassy: 'Büyükelçilik',
    
    operativeProfile: 'Operatif Profili',
    karma: 'Karma',
    missionsCompleted: 'Tamamlanan Görevler',
    zonesExplored: 'Keşfedilen Bölgeler',
    dataPoints: 'Veri Noktaları',
    joinedDate: 'Katılım Tarihi',
    
    deploy: 'Dağıt',
    download: 'İndir',
    cancel: 'İptal',
    confirm: 'Onayla',
    submit: 'Gönder',
    continue: 'Devam Et',
    
    appDescription: 'Kentsel operasyonlar için çevrimdışı taktik haritalar',
    ghostModeDescription: 'Ekran parlaklığını azaltır ve pil tasarrufu sağlar',
    offlineDescription: 'Kara Kutu verisi ile çevrimdışı çalışır',
    
    active: 'Aktif',
    offline: 'Çevrimdışı',
    online: 'Çevrimiçi',
    blackBox: 'Kara Kutu',
    caution: 'Dikkat',
    critical: 'Kritik',
    
    language: 'Dil',
    selectLanguage: 'Dil Seç',
  },
  
  vi: {
    home: 'Trang chủ',
    operative: 'Nhân viên',
    signIn: 'Đăng nhập',
    signOut: 'Đăng xuất',
    loading: 'Đang tải',
    error: 'Lỗi',
    back: 'Quay lại',
    
    systemBooting: 'Hệ thống khởi động',
    systemOperational: 'Hệ thống hoạt động',
    allModulesGreen: 'Tất cả mô-đun sẵn sàng',
    initializingMap: 'Khởi tạo bản đồ',
    loadingBlackBox: 'Đang tải dữ liệu hộp đen',
    calibratingGPS: 'Hiệu chỉnh GPS',
    
    mission: 'Nhiệm vụ',
    missionBrief: 'Tóm tắt nhiệm vụ',
    tacticalDisplay: 'Màn hình chiến thuật',
    abortMission: 'Hủy nhiệm vụ',
    gpsModule: 'Mô-đun GPS',
    opsNetwork: 'Mạng Ops',
    ghostMode: 'Chế độ ma',
    ghostModeActive: 'Hoạt động',
    ghostModeDisengaged: 'Tắt',
    
    zonesLoaded: 'Đã tải khu vực',
    zoneStatus: 'Trạng thái khu vực',
    zoneLocked: 'Khu vực khóa',
    anchorPoint: 'Điểm neo',
    recalibrateGPS: 'Hiệu chỉnh lại GPS',
    expandHud: 'Mở rộng HUD',
    collapseHud: 'Thu gọn HUD',
    reportHazard: 'Báo cáo nguy hiểm',
    exportToMaps: 'Xuất ra bản đồ',
    
    cityPackAvailable: 'Gói thành phố có sẵn',
    downloadCityPack: 'Tải gói thành phố',
    blackBoxAcquired: 'Đã có hộp đen',
    blackBoxNotFound: 'Không tìm thấy hộp đen',
    acquireBlackBox: 'Lấy hộp đen',
    packSize: 'Kích thước gói',
    offlineCapable: 'Có thể dùng offline',
    
    priceIntel: 'Thông tin giá',
    localComms: 'Liên lạc địa phương',
    tactiPhone: 'Tacti-Phone',
    emergency: 'Khẩn cấp',
    police: 'Cảnh sát',
    ambulance: 'Xe cứu thương',
    embassy: 'Đại sứ quán',
    
    operativeProfile: 'Hồ sơ nhân viên',
    karma: 'Karma',
    missionsCompleted: 'Nhiệm vụ hoàn thành',
    zonesExplored: 'Khu vực khám phá',
    dataPoints: 'Điểm dữ liệu',
    joinedDate: 'Ngày tham gia',
    
    deploy: 'Triển khai',
    download: 'Tải xuống',
    cancel: 'Hủy',
    confirm: 'Xác nhận',
    submit: 'Gửi',
    continue: 'Tiếp tục',
    
    appDescription: 'Bản đồ chiến thuật offline cho hoạt động đô thị',
    ghostModeDescription: 'Giảm độ sáng màn hình và tiết kiệm pin',
    offlineDescription: 'Hoạt động offline với dữ liệu hộp đen',
    
    active: 'Hoạt động',
    offline: 'Offline',
    online: 'Online',
    blackBox: 'Hộp đen',
    caution: 'Cảnh báo',
    critical: 'Nghiêm trọng',
    
    language: 'Ngôn ngữ',
    selectLanguage: 'Chọn ngôn ngữ',
  },
  
  id: {
    home: 'Beranda',
    operative: 'Operatif',
    signIn: 'Masuk',
    signOut: 'Keluar',
    loading: 'Memuat',
    error: 'Kesalahan',
    back: 'Kembali',
    
    systemBooting: 'Sistem Booting',
    systemOperational: 'Sistem Beroperasi',
    allModulesGreen: 'Semua Modul Siap',
    initializingMap: 'Inisialisasi Peta',
    loadingBlackBox: 'Memuat Data Black Box',
    calibratingGPS: 'Kalibrasi GPS',
    
    mission: 'Misi',
    missionBrief: 'Ringkasan Misi',
    tacticalDisplay: 'Tampilan Taktis',
    abortMission: 'Batalkan Misi',
    gpsModule: 'Modul GPS',
    opsNetwork: 'Jaringan Ops',
    ghostMode: 'Mode Hantu',
    ghostModeActive: 'Aktif',
    ghostModeDisengaged: 'Nonaktif',
    
    zonesLoaded: 'Zona Dimuat',
    zoneStatus: 'Status Zona',
    zoneLocked: 'Zona Terkunci',
    anchorPoint: 'Titik Jangkar',
    recalibrateGPS: 'Kalibrasi Ulang GPS',
    expandHud: 'Perluas HUD',
    collapseHud: 'Lipat HUD',
    reportHazard: 'Laporkan Bahaya',
    exportToMaps: 'Ekspor ke Peta',
    
    cityPackAvailable: 'Paket Kota Tersedia',
    downloadCityPack: 'Unduh Paket Kota',
    blackBoxAcquired: 'Black Box Didapat',
    blackBoxNotFound: 'Black Box Tidak Ditemukan',
    acquireBlackBox: 'Dapatkan Black Box',
    packSize: 'Ukuran Paket',
    offlineCapable: 'Dapat Digunakan Offline',
    
    priceIntel: 'Info Harga',
    localComms: 'Komunikasi Lokal',
    tactiPhone: 'Tacti-Phone',
    emergency: 'Darurat',
    police: 'Polisi',
    ambulance: 'Ambulans',
    embassy: 'Kedutaan',
    
    operativeProfile: 'Profil Operatif',
    karma: 'Karma',
    missionsCompleted: 'Misi Selesai',
    zonesExplored: 'Zona Dijelajahi',
    dataPoints: 'Titik Data',
    joinedDate: 'Tanggal Bergabung',
    
    deploy: 'Sebarkan',
    download: 'Unduh',
    cancel: 'Batal',
    confirm: 'Konfirmasi',
    submit: 'Kirim',
    continue: 'Lanjut',
    
    appDescription: 'Peta taktis offline untuk operasi perkotaan',
    ghostModeDescription: 'Mengurangi kecerahan layar dan menghemat baterai',
    offlineDescription: 'Bekerja offline dengan data Black Box',
    
    active: 'Aktif',
    offline: 'Offline',
    online: 'Online',
    blackBox: 'Black Box',
    caution: 'Hati-hati',
    critical: 'Kritis',
    
    language: 'Bahasa',
    selectLanguage: 'Pilih Bahasa',
  },
  
  pl: {
    home: 'Strona główna',
    operative: 'Operacyjny',
    signIn: 'Zaloguj się',
    signOut: 'Wyloguj się',
    loading: 'Ładowanie',
    error: 'Błąd',
    back: 'Wstecz',
    
    systemBooting: 'Uruchamianie systemu',
    systemOperational: 'System operacyjny',
    allModulesGreen: 'Wszystkie moduły gotowe',
    initializingMap: 'Inicjalizacja mapy',
    loadingBlackBox: 'Ładowanie danych czarnej skrzynki',
    calibratingGPS: 'Kalibracja GPS',
    
    mission: 'Misja',
    missionBrief: 'Briefing misji',
    tacticalDisplay: 'Wyświetlacz taktyczny',
    abortMission: 'Przerwij misję',
    gpsModule: 'Moduł GPS',
    opsNetwork: 'Sieć Ops',
    ghostMode: 'Tryb ducha',
    ghostModeActive: 'Aktywny',
    ghostModeDisengaged: 'Nieaktywny',
    
    zonesLoaded: 'Załadowane strefy',
    zoneStatus: 'Status strefy',
    zoneLocked: 'Strefa zablokowana',
    anchorPoint: 'Punkt zakotwiczenia',
    recalibrateGPS: 'Rekalibruj GPS',
    expandHud: 'Rozwiń HUD',
    collapseHud: 'Zwiń HUD',
    reportHazard: 'Zgłoś zagrożenie',
    exportToMaps: 'Eksportuj do map',
    
    cityPackAvailable: 'Pakiet miasta dostępny',
    downloadCityPack: 'Pobierz pakiet miasta',
    blackBoxAcquired: 'Czarna skrzynka pozyskana',
    blackBoxNotFound: 'Czarna skrzynka nie znaleziona',
    acquireBlackBox: 'Pozyskaj czarną skrzynkę',
    packSize: 'Rozmiar pakietu',
    offlineCapable: 'Dostępne offline',
    
    priceIntel: 'Informacje o cenach',
    localComms: 'Komunikacja lokalna',
    tactiPhone: 'Tacti-Phone',
    emergency: 'Pogotowie',
    police: 'Policja',
    ambulance: 'Karetka',
    embassy: 'Ambasada',
    
    operativeProfile: 'Profil operacyjny',
    karma: 'Karma',
    missionsCompleted: 'Ukończone misje',
    zonesExplored: 'Zbadane strefy',
    dataPoints: 'Punkty danych',
    joinedDate: 'Data dołączenia',
    
    deploy: 'Wdróż',
    download: 'Pobierz',
    cancel: 'Anuluj',
    confirm: 'Potwierdź',
    submit: 'Wyślij',
    continue: 'Kontynuuj',
    
    appDescription: 'Mapy taktyczne offline dla operacji miejskich',
    ghostModeDescription: 'Zmniejsza jasność ekranu i oszczędza baterię',
    offlineDescription: 'Działa offline z danymi czarnej skrzynki',
    
    active: 'Aktywny',
    offline: 'Offline',
    online: 'Online',
    blackBox: 'Czarna skrzynka',
    caution: 'Ostrożnie',
    critical: 'Krytyczny',
    
    language: 'Język',
    selectLanguage: 'Wybierz język',
  },
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  th: 'ไทย (Thai)',
  ja: '日本語 (Japanese)',
  es: 'Español (Spanish)',
  zh: '中文 (Chinese)',
  fr: 'Français (French)',
  de: 'Deutsch (German)',
  ko: '한국어 (Korean)',
  pt: 'Português (Portuguese)',
  ru: 'Русский (Russian)',
  ar: 'العربية (Arabic)',
  hi: 'हिंदी (Hindi)',
  it: 'Italiano (Italian)',
  nl: 'Nederlands (Dutch)',
  tr: 'Türkçe (Turkish)',
  vi: 'Tiếng Việt (Vietnamese)',
  id: 'Bahasa Indonesia (Indonesian)',
  pl: 'Polski (Polish)',
};
