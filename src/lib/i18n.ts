import type { Locale, LocalizedText, NightMarket, OpeningDay, StyleId } from "../types";

export const uiCopy = {
  en: {
    appName: "Taiwan Night Market Finder",
    compareEyebrow: "Side-by-side design comparison",
    compareTitle: "Taiwan Night Market Finder",
    compareIntro:
      "Two retained product directions using the same search, filters, night-market data, detail model, and fallback-source handling.",
    comparisonCta: "Compare 2 versions",
    openVersion: "Open version",
    liveCore: "Live shared core",
    matches: "matches",
    filters: "filters",
    focus: "focus",
    markets: "markets",
    cities: "cities",
    styles: "styles",
    city: "city",
    minWalk: "min walk",
    routeReady: "fallback data ready",
    searchLabel: "Search by market, city, mood, food, or transport",
    searchPlaceholder: "Search city, market, food, MRT...",
    allCities: "All cities",
    anyMood: "Any mood",
    anyFood: "Any food",
    anyTransit: "Any transit",
    clear: "Clear",
    clearAll: "Clear all filters",
    cityCounty: "City or county",
    mood: "Mood",
    foodType: "Food type",
    transportation: "Transportation",
    tonightMatch: "Tonight match",
    curatedRoute: "Curated route",
    nearestAccess: "Nearest access",
    viewDetails: "View details",
    viewingDetails: "Viewing details",
    detailView: "Detail view",
    recommendedFoods: "Recommended foods",
    practicalInfo: "Practical visiting info",
    sourceReference: "Source reference",
    open: "Open",
    hours: "Hours",
    station: "Station",
    walk: "Walk",
    dataNoticeTitle: "Using curated fallback data with source labels.",
    dataNoticeBody:
      "Official datasets do not consistently include coordinates, food tags, transport, and opening days. Each card marks source confidence, and the README lists the public source references used.",
    dataNoticeBodyCompact: "Using curated fallback data with source labels.",
    schematicMap: "Schematic locator, not turn-by-turn navigation",
    dataErrorTitle: "Data could not be loaded.",
    dataErrorBody:
      "The app is designed to fall back to bundled public-source data. Retry to return to the local fallback dataset.",
    retryData: "Retry fallback data",
    emptyTitle: "No markets match these filters.",
    emptyBody:
      "Try a broader city, remove the opening-day filter, or search for a specific food like seafood, pepper buns, tea, or fried chicken.",
    languageLabel: "Language",
    styleNav: "Style navigation",
    mapAria: "Schematic Taiwan map with night market markers",
    english: "EN",
    chinese: "中文",
  },
  zh: {
    appName: "台灣夜市探索",
    compareEyebrow: "兩個版本並排比較",
    compareTitle: "台灣夜市探索",
    compareIntro:
      "兩個保留的前端方向共用同一份搜尋、篩選、夜市資料、詳情模型與備援資料說明，可直接比較後再挑一版精修。",
    comparisonCta: "比較 2 個版本",
    openVersion: "開啟版本",
    liveCore: "共用產品核心",
    matches: "符合",
    filters: "篩選",
    focus: "焦點",
    markets: "夜市",
    cities: "縣市",
    styles: "版本",
    city: "城市",
    minWalk: "步行分",
    routeReady: "備援資料已載入",
    searchLabel: "依夜市、城市、氣氛、美食或交通搜尋",
    searchPlaceholder: "搜尋城市、夜市、美食、捷運...",
    allCities: "全部縣市",
    anyMood: "不限氣氛",
    anyFood: "不限美食",
    anyTransit: "不限交通",
    clear: "清除",
    clearAll: "清除全部篩選",
    cityCounty: "縣市",
    mood: "氣氛",
    foodType: "美食類型",
    transportation: "交通方式",
    tonightMatch: "今晚推薦",
    curatedRoute: "精選路線",
    nearestAccess: "最近交通",
    viewDetails: "查看詳情",
    viewingDetails: "正在查看",
    detailView: "夜市詳情",
    recommendedFoods: "推薦美食",
    practicalInfo: "實用資訊",
    sourceReference: "資料來源",
    open: "營業日",
    hours: "時間",
    station: "車站",
    walk: "步行",
    dataNoticeTitle: "目前使用整理過的備援資料，並標示資料可信度。",
    dataNoticeBody:
      "官方開放資料不一定同時提供座標、美食標籤、交通與營業日；每張卡片都會標示資料可信度，README 也列出使用的公開資料來源。",
    dataNoticeBodyCompact: "使用整理過的備援資料，並標示資料可信度。",
    schematicMap: "示意定位圖，非即時路線導航",
    dataErrorTitle: "資料載入失敗。",
    dataErrorBody: "此 app 已內建公開資料備援；請重試回到本地備援資料。",
    retryData: "重試載入備援資料",
    emptyTitle: "沒有符合條件的夜市。",
    emptyBody: "可以放寬縣市、取消營業日，或搜尋海鮮、胡椒餅、飲料、雞排等美食。",
    languageLabel: "語言",
    styleNav: "版本導覽",
    mapAria: "台灣夜市示意地圖",
    english: "EN",
    chinese: "中文",
  },
} as const;

export const styleCopy = {
  en: {
    neon: {
      version: "Version 1",
      name: "Neon Night Market",
      shortName: "Neon",
      label: "Atmospheric",
      summary: "Dark, energetic, food-street first discovery with neon hierarchy.",
      heroTitle: "Find tonight's brightest food street.",
      heroBody:
        "Search Taiwan night markets by opening day, food craving, mood, station access, and local visiting notes.",
      openCta: "Open Neon",
    },
    travel: {
      version: "Version 2",
      name: "Modern Travel Guide",
      shortName: "Travel",
      label: "Premium",
      summary: "Clean editorial spacing, calm cards, and itinerary-friendly details.",
      heroTitle: "Choose the right night market for the trip you are actually taking.",
      heroBody:
        "Calm discovery cards, quick route context, and practical notes for first-timers, repeat travelers, families, and late-night food runs.",
      openCta: "Open Travel",
    },
  },
  zh: {
    neon: {
      version: "版本 1",
      name: "霓虹夜市版",
      shortName: "霓虹",
      label: "氣氛型",
      summary: "深色、霓虹、街邊小吃氛圍，適合強品牌感的夜市探索。",
      heroTitle: "找到今晚最亮的美食街。",
      heroBody: "用營業日、想吃的美食、氣氛、車站距離與在地提醒快速篩選台灣夜市。",
      openCta: "開啟霓虹版",
    },
    travel: {
      version: "版本 2",
      name: "現代旅遊指南版",
      shortName: "旅遊",
      label: "質感型",
      summary: "乾淨留白、精緻卡片與旅遊規劃感，適合做成高信任感指南。",
      heroTitle: "依照真正的行程，挑今晚適合的夜市。",
      heroBody: "用沉穩卡片、交通脈絡與實用提醒，服務初訪者、回訪旅人、親子與宵夜行程。",
      openCta: "開啟旅遊版",
    },
  },
} as const;

const cityZh: Record<string, string> = {
  Chiayi: "嘉義",
  Hualien: "花蓮",
  Kaohsiung: "高雄",
  Keelung: "基隆",
  "New Taipei": "新北",
  Taichung: "台中",
  Tainan: "台南",
  Taipei: "台北",
  Taoyuan: "桃園",
  Yilan: "宜蘭",
};

const districtZh: Record<string, string> = {
  Shilin: "士林",
  Songshan: "松山",
  Datong: "大同",
  "Da'an": "大安",
  Yonghe: "永和",
  Taoyuan: "桃園",
  Zhongli: "中壢",
  Xitun: "西屯",
  North: "北區",
  East: "東區",
  "West Central": "中西區",
  Xinxing: "新興",
  Zuoying: "左營",
  Luodong: "羅東",
  "Hualien City": "花蓮市",
  "Ren'ai": "仁愛",
};

const tagZh: Record<string, string> = {
  "aboriginal cuisine": "原民風味",
  "after-work": "下班聚餐",
  "beef noodles": "牛肉麵",
  "braised snacks": "滷味",
  "bubble tea": "珍珠奶茶",
  "central": "市中心",
  "classic": "經典",
  "coffin bread": "棺材板",
  "compact": "精簡好逛",
  "creative snacks": "創意小吃",
  "day-to-night": "午後到夜晚",
  "dessert": "甜點",
  "family": "親子",
  "first-timers": "初訪推薦",
  "food-first": "美食優先",
  "fried chicken": "雞排",
  "fried snacks": "炸物",
  "games": "遊戲攤",
  "grilled corn": "烤玉米",
  "grilled skewers": "烤串",
  "grilled snacks": "烤物",
  "herbal soup": "藥燉湯",
  "hot pot": "小火鍋",
  "iconic": "代表性",
  "late-night": "深夜場",
  "local": "在地",
  "mochi": "麻糬",
  "mutton soup": "羊肉湯",
  "neighborhood": "社區型",
  "nutritious sandwich": "營養三明治",
  "open-air": "露天",
  "oyster omelet": "蚵仔煎",
  "papaya milk": "木瓜牛奶",
  "pepper buns": "胡椒餅",
  "regional": "地方特色",
  "rice dishes": "米食",
  "scallion pancake": "蔥油餅",
  "seafood": "海鮮",
  "shopping": "逛街",
  "skewers": "串燒",
  "soy milk": "豆漿小吃",
  "steak": "夜市牛排",
  "stinky tofu": "臭豆腐",
  "student": "學生感",
  "sweet soup": "甜湯",
  "taro balls": "芋圓",
  "tea": "手搖飲",
  "temple": "廟口",
  "tempura": "甜不辣",
  "tourist": "觀光",
  "turkey rice": "火雞肉飯",
};

const transportZh: Record<string, string> = {
  MRT: "捷運",
  bus: "公車",
  rail: "台鐵",
  taxi: "計程車",
};

const confidenceZh: Record<NightMarket["source"]["confidence"], string> = {
  official: "官方資料",
  curated: "整理資料",
  fallback: "備援資料",
};

const confidenceEn: Record<NightMarket["source"]["confidence"], string> = {
  official: "official",
  curated: "curated",
  fallback: "fallback",
};

const dayZh: Record<OpeningDay, string> = {
  Mon: "一",
  Tue: "二",
  Wed: "三",
  Thu: "四",
  Fri: "五",
  Sat: "六",
  Sun: "日",
};

export function getStyleCopy(styleId: StyleId, locale: Locale) {
  return styleCopy[locale][styleId];
}

export function labelCity(value: string, locale: Locale) {
  return locale === "zh" ? cityZh[value] ?? value : value;
}

export function labelDistrict(value: string, locale: Locale) {
  return locale === "zh" ? districtZh[value] ?? value : value;
}

export function labelTag(value: string, locale: Locale) {
  return locale === "zh" ? tagZh[value] ?? value : value;
}

export function labelTransport(value: string, locale: Locale) {
  return locale === "zh" ? transportZh[value] ?? value : value;
}

export function labelConfidence(value: NightMarket["source"]["confidence"], locale: Locale) {
  return locale === "zh" ? confidenceZh[value] : confidenceEn[value];
}

export function labelDay(value: OpeningDay, locale: Locale) {
  return locale === "zh" ? dayZh[value] : value;
}

export function localize(text: LocalizedText, locale: Locale) {
  return locale === "zh" ? text.zh : text.en;
}

export function formatMarketTitle(market: NightMarket, locale: Locale) {
  return {
    primary: locale === "zh" ? market.localName : market.name,
    secondary: locale === "zh" ? market.name : market.localName,
    location: `${labelCity(market.city, locale)} / ${labelDistrict(market.district, locale)}`,
  };
}
