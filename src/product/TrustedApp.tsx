import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  ExternalLink,
  Info,
  Languages,
  MapPin,
  Moon,
  Navigation,
  Search,
  Share2,
  ShieldCheck,
  Sun,
  TriangleAlert,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { appUrl, getAppLocation } from "../lib/basePath";
import {
  OPENING_DAYS,
  getMarketDecision,
  marketDataset,
  type FieldEvidence,
  type OpeningDay,
  type TrustedMarket,
} from "./marketData";
import { dayLabels, scheduleText } from "./scheduleText";
import { districtDataset, getDistrict, pilotDistricts, type TrustedDistrict } from "./districtData";
import { DISTRICT_TILE_COLUMNS, DISTRICT_TILE_ROWS, districtTiles } from "./districtTiles";
import {
  formatCompactDate,
  formatDecisionDate,
  getDateChoices,
  getScheduleDay,
  getTaipeiToday,
  isIsoDate,
} from "./date";

type Locale = "zh" | "en";
type MarketDecision = ReturnType<typeof getMarketDecision>;

const copy = {
  zh: {
    brand: "今晚哪裡有市",
    pilot: "臺南資料可追溯試行版",
    skip: "跳到主要內容",
    eyebrow: "臺南・依正常週期",
    titleSuffix: "哪些夜市排定營業？",
    intro:
      "依臺南市政府許可名冊整理，先回答所選日期正常週期有沒有排班。這不是現場即時開門保證，出發前仍請查看原始來源或地圖。",
    chooseDate: "選擇日期",
    today: "今天",
    searchLabel: "搜尋夜市或許可區域",
    searchPlaceholder: "搜尋武聖、東區…",
    clearSearch: "清除搜尋",
    chooseDistrict: "行政區（選填）",
    allPilotDistricts: "全部本名冊行政區",
    districtHelp: "只依官方行政區代碼縮小候選；不是附近、距離或推薦排序。",
    invalidDistrict: "連結中的行政區條件無效，已改為顯示全部本名冊行政區。",
    clearFilters: "清除條件",
    confirmed: "依週期有營業",
    needsCheck: "需再確認",
    sourceChecked: "資料比對",
    upstreamUnknown: "來源未提供更新時間",
    resultsTitle: "可出發前再確認的候選",
    resultsSummary: (confirmed: number, needsCheck: number) =>
      `${confirmed} 個正常週期候選，${needsCheck} 個資料需再確認`,
    noResults: "這個條件下沒有可安全顯示的當日候選",
    noResultsHint: "可能是搜尋到的夜市在所選日期沒有排班；請清除搜尋或改選日期。",
    schedule: "正常營業日",
    permitArea: "許可路段或區域",
    district: "行政區",
    districtCode: "行政區代碼",
    details: "查看依據與導航",
    checkedAt: "資料比對",
    normalSchedule: "依正常週期有營業",
    conflict: "資料來源對這一天有分歧",
    stale: "資料已超過比對期限",
    unknown: "目前無法安全判斷",
    notScheduled: "依正常週期未排班",
    back: "回到候選清單",
    decisionFor: "所選日期判斷",
    exceptionNote:
      "臨時停業、天候、節慶加開與個別攤商狀況不在名冊內；本產品不會把正常週期描述成即時營業。",
    map: "用 Google Maps 搜尋導航",
    mapDisclosure: "以夜市名稱搜尋，不是官方座標",
    share: "分享這個日期與夜市",
    sharing: "準備分享…",
    shared: "連結已準備完成。",
    copied: "連結已複製。",
    shareFailed: "無法自動分享，請從瀏覽器網址列複製。",
    evidenceTitle: "這個判斷的資料依據",
    evidenceIntro: "來源只替它實際提供的欄位背書；沒有整筆夜市的「官方」標章。",
    officialSchedule: "正常營業日來源",
    publisher: "提供機關",
    retrieved: "本產品擷取",
    sourceUpdated: "來源更新",
    verified: "資料比對",
    sourceUpdatedUnknown: "未提供",
    openSource: "開啟原始來源",
    fieldValue: "來源記載",
    sourceVerified: "資料已比對",
    sourceValuesDiffer: "來源值有差異",
    selectedDateAgrees: "所選日期一致",
    sourceLabel: "來源",
    derivationLabel: "衍生方式",
    otherEvidence: "其他決策欄位來源",
    fieldName: "夜市名稱",
    fieldPermitArea: "許可路段或區域",
    fieldNavigation: "Maps 搜尋字串",
    staleDatasetNotice:
      "這份名冊已超過 90 天未重新比對；只列出舊名冊中曾排定所選星期的項目，而且全部需要出發前再確認。",
    staleDetailNotice:
      "這個判斷使用的名冊也已超過 90 天未重新比對；即使另有來源衝突，出發前仍需重新確認。",
    conflictExplanation:
      "至少兩個臺南市政府來源對這一天的描述不同，因此不列入已確認候選。",
    sourceScopeTitle: "資料範圍與新鮮度",
    sourceScope: (count: number) =>
      `目前收錄臺南市政府許可名冊 ${count} 筆。名冊提供名稱、許可區域與正常營業日，不提供即時開門狀態。`,
    sourcePage: "查看臺南市政府資料集",
    districtSourcePage: "查看臺南市行政區代碼來源",
    attribution: "資料來源：臺南市政府經濟發展局，政府資料開放授權條款第 1 版。",
    lab: "視覺原型保留於 lab，不是公共首頁。",
    correction: "回報資料或產品問題（需要 GitHub 登入）",
    privacy: "隱私、可近用性與已知限制",
    notFoundTitle: "找不到這個夜市資料",
    notFoundBody: "連結可能已過期或輸入有誤；我們不會靜默改成另一個夜市。",
    home: "回到候選清單",
    family: "台灣生活資料誌",
    introShort: "依官方名冊的正常週期整理，不是即時開門保證。",
    tonight: "今晚",
    city: "臺南",
    heroUnit: "個夜市依週期排定營業",
    heroNeedsCheck: (count: number) => `另有 ${count} 個需出發前再確認`,
    heroFreshness: (date: string, days: number) => `名冊比對於 ${date}（${days} 天前）`,
    records: (count: number) => `收錄 ${count} 筆許可夜市`,
    illustration: "示意插圖，非特定夜市",
    dateCount: (count: number) => `${count} 個`,
    dateCountLabel: (count: number) => `${count} 個依週期有營業`,
    statusLabel: "依判斷篩選",
    statusAll: "全部候選",
    statusConfirmed: "依週期有營業",
    statusCheck: "需再確認",
    viewLabel: "檢視方式",
    viewList: "列表",
    viewMap: "行政區圖",
    mapTitle: "行政區示意圖",
    mapNote: "依官方行政區排列的示意方格，不是比例地圖，也不代表夜市位置。點選有夜市的區可直接篩選。",
    mapLegendOpen: "所選日期有候選",
    mapLegendRegistered: "名冊有夜市、當日無",
    mapLegendNone: "名冊無夜市",
    mapTile: (district: string, count: number, registered: number) =>
      `${district}：所選日期 ${count} 個候選，名冊共 ${registered} 個`,
    mapShowAll: "顯示全部行政區",
    cardSource: "來源",
    themeToDark: "切換為深色模式",
    themeToLight: "切換為淺色模式",
    weekLabel: "一週排班",
  },
  en: {
    brand: "Tonight's Tainan Markets",
    pilot: "Traceable Tainan pilot",
    skip: "Skip to main content",
    eyebrow: "Tainan · regular schedule",
    titleSuffix: "which markets are scheduled?",
    intro:
      "Based on Tainan City's licensed-market register. This answers the regular weekly schedule, not whether stalls are open right now. Check the original source or map before leaving.",
    chooseDate: "Choose a date",
    today: "Today",
    searchLabel: "Search a market or permitted area",
    searchPlaceholder: "Try 武聖 or 東區…",
    clearSearch: "Clear search",
    chooseDistrict: "District (optional)",
    allPilotDistricts: "All pilot districts",
    districtHelp: "Narrows candidates by the official district code only; not nearby, distance, or a recommendation.",
    invalidDistrict: "The district in this link is invalid, so all pilot districts are shown.",
    clearFilters: "Clear filters",
    confirmed: "Scheduled",
    needsCheck: "Needs checking",
    sourceChecked: "Data checked",
    upstreamUnknown: "Source update time unavailable",
    resultsTitle: "Candidates to confirm before leaving",
    resultsSummary: (confirmed: number, needsCheck: number) =>
      `${confirmed} scheduled candidates, ${needsCheck} needing confirmation`,
    noResults: "No same-day candidate can be shown safely for this search",
    noResultsHint: "The matching market may not be scheduled that day. Clear search or choose another date.",
    schedule: "Regular days",
    permitArea: "Permitted area",
    district: "District",
    districtCode: "District code",
    details: "Evidence and directions",
    checkedAt: "Verified",
    normalSchedule: "Scheduled on its regular cycle",
    conflict: "Sources disagree for this day",
    stale: "Data check is too old",
    unknown: "Cannot determine safely",
    notScheduled: "Not on the regular schedule",
    back: "Back to candidates",
    decisionFor: "Decision for selected date",
    exceptionNote:
      "Temporary closures, weather, special openings, and individual stalls are not covered. A regular schedule is never presented as live status.",
    map: "Search directions in Google Maps",
    mapDisclosure: "Name-based search, not official coordinates",
    share: "Share this market and date",
    sharing: "Preparing…",
    shared: "Share link is ready.",
    copied: "Link copied.",
    shareFailed: "Automatic sharing failed. Copy the browser URL instead.",
    evidenceTitle: "Evidence behind this decision",
    evidenceIntro: "Each source supports only the fields it provides; there is no whole-market “official” badge.",
    officialSchedule: "Regular-schedule sources",
    publisher: "Publisher",
    retrieved: "Retrieved here",
    sourceUpdated: "Source updated",
    verified: "Checked here",
    sourceUpdatedUnknown: "Not provided",
    openSource: "Open original source",
    fieldValue: "Source value",
    sourceVerified: "Data checked",
    sourceValuesDiffer: "Source values differ",
    selectedDateAgrees: "Sources agree for this date",
    sourceLabel: "Source",
    derivationLabel: "Derivation",
    otherEvidence: "Other decision-field sources",
    fieldName: "Market name",
    fieldPermitArea: "Permitted area",
    fieldNavigation: "Maps search query",
    staleDatasetNotice:
      "This register has not been checked for over 90 days. Only entries previously scheduled for this weekday are shown, and every one needs confirmation before travel.",
    staleDetailNotice:
      "The register behind this decision has also gone unchecked for over 90 days. Confirm again before travel, even when a separate source conflict is shown.",
    conflictExplanation:
      "At least two Tainan City sources differ for this date, so this market is not placed in the confirmed group.",
    sourceScopeTitle: "Coverage and freshness",
    sourceScope: (count: number) =>
      `The pilot contains ${count} records from Tainan City's licensed-market register. It provides names, permitted areas, and regular days—not live opening status.`,
    sourcePage: "Open the Tainan City dataset",
    districtSourcePage: "Open the Tainan district-code source",
    attribution: "Source: Economic Development Bureau, Tainan City Government. Open Government Data License 1.0.",
    lab: "The visual prototype remains in the lab and is not the public homepage.",
    correction: "Report a data or product issue (GitHub sign-in required)",
    privacy: "Privacy, accessibility, and known limitations",
    notFoundTitle: "This market record was not found",
    notFoundBody: "The link may be old or mistyped. We will not silently substitute another market.",
    home: "Back to candidates",
    family: "Taiwan Life Data",
    introShort: "Regular schedule from the official register—not live opening status.",
    tonight: "Tonight",
    city: "Tainan",
    heroUnit: "markets scheduled on their regular cycle",
    heroNeedsCheck: (count: number) => `${count} more need checking before you go`,
    heroFreshness: (date: string, days: number) => `Register checked ${date} (${days} days ago)`,
    records: (count: number) => `${count} licensed markets`,
    illustration: "Illustration, not a specific market",
    dateCount: (count: number) => `${count}`,
    dateCountLabel: (count: number) => `${count} scheduled`,
    statusLabel: "Filter by decision",
    statusAll: "All candidates",
    statusConfirmed: "Scheduled",
    statusCheck: "Needs checking",
    viewLabel: "View",
    viewList: "List",
    viewMap: "District map",
    mapTitle: "District tile map",
    mapNote: "Official districts arranged as schematic tiles—not a scaled map and not market locations. Tap a district with markets to filter.",
    mapLegendOpen: "Candidates on this date",
    mapLegendRegistered: "Registered, none this date",
    mapLegendNone: "No registered market",
    mapTile: (district: string, count: number, registered: number) =>
      `${district}: ${count} candidates on this date, ${registered} in the register`,
    mapShowAll: "Show all districts",
    cardSource: "Source",
    themeToDark: "Switch to dark mode",
    themeToLight: "Switch to light mode",
    weekLabel: "Weekly schedule",
  },
} as const;

interface LocationState {
  pathname: string;
  selectedMarketId: string | null;
  isUnknownPath: boolean;
  date: string;
  query: string;
  districtCode: string;
  invalidDistrictCode: string | null;
}

function readLocation(): LocationState {
  const appLocation = getAppLocation();
  const pathname = appLocation.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const params = new URLSearchParams(appLocation.search);
  const requestedDate = params.get("date");
  const requestedDistrictCode = params.get("district")?.trim() ?? "";
  const isMarketRoute = segments.length === 2 && segments[0] === "market";
  let selectedMarketId: string | null = null;
  if (isMarketRoute) {
    try {
      selectedMarketId = decodeURIComponent(segments[1]);
    } catch {
      selectedMarketId = null;
    }
  }

  return {
    pathname,
    selectedMarketId,
    isUnknownPath: segments.length > 0 && (!isMarketRoute || selectedMarketId === null),
    date: isIsoDate(requestedDate) ? requestedDate : getTaipeiToday(),
    query: params.get("q")?.trim() ?? "",
    districtCode: pilotDistricts.some((district) => district.code === requestedDistrictCode)
      ? requestedDistrictCode
      : "",
    invalidDistrictCode:
      requestedDistrictCode && !pilotDistricts.some((district) => district.code === requestedDistrictCode)
        ? requestedDistrictCode
        : null,
  };
}

function writeLocation(
  next: { pathname?: string; date: string; query: string; districtCode: string },
  options: { replace?: boolean; scroll?: boolean } = {},
) {
  const params = new URLSearchParams();
  params.set("date", next.date);
  if (next.query) {
    params.set("q", next.query);
  }
  if (next.districtCode) {
    params.set("district", next.districtCode);
  }
  const url = appUrl(next.pathname ?? getAppLocation().pathname, params);

  if (options.replace) {
    window.history.replaceState({}, "", url);
  } else {
    window.history.pushState({}, "", url);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (options.scroll ?? !options.replace) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
}

function useLocationState() {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return location;
}

function useLocale() {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      return window.localStorage?.getItem("verified-night-market-locale") === "en" ? "en" : "zh";
    } catch {
      return "zh";
    }
  });

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hant" : "en";
    try {
      window.localStorage?.setItem("verified-night-market-locale", locale);
    } catch {
      // Language remains usable when storage is blocked or unavailable.
    }
  }, [locale]);

  return [locale, setLocale] as const;
}

function formatEvidenceDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function setPageMetadata(title: string, description: string, canonicalPath: string) {
  document.title = title;
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) {
    canonical.href = new URL(appUrl(canonicalPath), window.location.origin).toString();
  }

  const values = [
    ['meta[name="description"]', description],
    ['meta[property="og:title"]', title],
    ['meta[property="og:description"]', description],
    ['meta[name="twitter:title"]', title],
    ['meta[name="twitter:description"]', description],
  ] as const;
  values.forEach(([selector, value]) => {
    document.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", value);
  });

  const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  ogUrl?.setAttribute("content", new URL(appUrl(canonicalPath), window.location.origin).toString());
}

function decisionLabel(decision: MarketDecision, locale: Locale) {
  const c = copy[locale];
  switch (decision.status) {
    case "confirmed":
      return c.normalSchedule;
    case "conflict":
      return c.conflict;
    case "stale":
      return c.stale;
    case "unknown":
      return c.unknown;
    default:
      return c.notScheduled;
  }
}

function decisionTone(decision: MarketDecision) {
  if (decision.status === "confirmed") {
    return "confirmed" as const;
  }
  if (decision.status === "conflict") {
    return "conflict" as const;
  }
  return "degraded" as const;
}

// One content container for every section: 1200px of content plus fixed gutters.
const pageContainer = "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-12";
const focusRing =
  "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lantern";
const weekdayInitials: Record<Locale, string[]> = {
  zh: ["一", "二", "三", "四", "五", "六", "日"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
};

function useMediaQuery(query: string) {
  const get = () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : true);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggle = () => {
    const next = !dark;
    try {
      window.localStorage?.setItem("night-market-theme", next ? "dark" : "light");
    } catch {
      // The theme still switches for this visit when storage is blocked.
    }
    setDark(next);
  };

  return [dark, toggle] as const;
}

function LanguageToggle({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <div
      aria-label={locale === "zh" ? "語言" : "Language"}
      className="inline-flex items-center rounded-xl border border-edge bg-surface p-1"
      role="group"
    >
      <Languages aria-hidden="true" className="mx-2 hidden text-subtle sm:block" size={16} />
      {(["zh", "en"] as const).map((option) => (
        <button
          aria-pressed={locale === option}
          className={clsx(
            "min-h-11 min-w-11 rounded-lg px-3 text-sm font-bold sm:px-3",
            focusRing,
            locale === option ? "bg-fg text-canvas" : "text-muted hover:bg-raised",
          )}
          key={option}
          onClick={() => setLocale(option)}
          type="button"
        >
          {option === "zh" ? "中文" : "EN"}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle({ locale }: { locale: Locale }) {
  const [dark, toggle] = useTheme();
  const c = copy[locale];
  return (
    <button
      aria-label={dark ? c.themeToLight : c.themeToDark}
      className={clsx(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-edge bg-surface text-muted transition-colors hover:text-fg",
        focusRing,
      )}
      onClick={toggle}
      title={dark ? c.themeToLight : c.themeToDark}
      type="button"
    >
      {dark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
    </button>
  );
}

function AppHeader({
  locale,
  setLocale,
  center,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  center?: ReactNode;
}) {
  const c = copy[locale];
  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-canvas">
      <div className={clsx(pageContainer, "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3 lg:min-h-20 lg:flex-nowrap lg:py-4")}>
        <a
          className={clsx("flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg transition-opacity hover:opacity-80 lg:w-72 lg:flex-none", focusRing)}
          href={appUrl("/", new URLSearchParams({ date: getTaipeiToday() }))}
          onClick={(event) => {
            event.preventDefault();
            writeLocation({ pathname: "/", date: getTaipeiToday(), query: "", districtCode: "" });
          }}
        >
          <span aria-hidden="true" className="lantern-mark shrink-0 text-lg font-black">
            市
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold tracking-tight text-lantern sm:text-lg">{c.brand}</span>
            <span className="hidden truncate text-sm text-muted sm:block">{c.pilot}</span>
          </span>
        </a>
        {center ? <div className="order-last w-full lg:order-none lg:w-auto lg:max-w-xl lg:flex-1">{center}</div> : null}
        <div className="flex shrink-0 items-center justify-end gap-2 lg:w-72">
          <ThemeToggle locale={locale} />
          <LanguageToggle locale={locale} setLocale={setLocale} />
        </div>
      </div>
    </header>
  );
}

// Airbnb-style search capsule: two labelled segments separated by a hairline.
function SearchPill({ locale, location }: { locale: Locale; location: LocationState }) {
  const c = copy[locale];
  const { date, query, districtCode } = location;
  return (
    <div className="flex min-h-14 items-center rounded-full border border-edge bg-surface shadow-[0_3px_12px_rgb(0_0_0/0.08)]">
      <div className="relative min-w-0 flex-1">
        <label className="sr-only" htmlFor="market-search">
          {c.searchLabel}
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg" size={18} />
        <input
          autoComplete="off"
          className="min-h-12 w-full rounded-full bg-transparent py-2 pl-12 pr-12 text-base text-fg outline-hidden placeholder:text-muted focus-visible:ring-2 focus-visible:ring-lantern/40"
          id="market-search"
          name="market-search"
          onChange={(event) =>
            writeLocation(
              { pathname: "/", date, query: event.target.value, districtCode },
              { replace: true, scroll: false },
            )
          }
          placeholder={c.searchPlaceholder}
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label={c.clearSearch}
            className={clsx(
              "absolute right-1 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-raised",
              focusRing,
            )}
            onClick={() =>
              writeLocation({ pathname: "/", date, query: "", districtCode }, { replace: true, scroll: false })
            }
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        ) : null}
      </div>
      <span aria-hidden="true" className="h-8 w-px shrink-0 bg-edge" />
      <div className="min-w-0 shrink-0 basis-[42%] sm:basis-56">
        <label className="sr-only" htmlFor="district-filter">
          {c.chooseDistrict}
        </label>
        <select
          className="min-h-12 w-full cursor-pointer truncate rounded-full bg-transparent py-2 pl-4 pr-4 text-base font-semibold text-fg outline-hidden focus-visible:ring-2 focus-visible:ring-lantern/40"
          id="district-filter"
          name="district-filter"
          onChange={(event) =>
            writeLocation(
              { pathname: "/", date, query, districtCode: event.target.value },
              { replace: true, scroll: false },
            )
          }
          value={districtCode}
        >
          <option value="">{c.allPilotDistricts}</option>
          {pilotDistricts.map((district) => (
            <option key={district.code} value={district.code}>
              {district.shortName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function WeekDots({
  days,
  conflictDays = [],
  highlight,
  locale,
}: {
  days: readonly OpeningDay[];
  conflictDays?: readonly OpeningDay[];
  highlight?: OpeningDay;
  locale: Locale;
}) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {OPENING_DAYS.map((day, index) => {
        const scheduled = days.includes(day);
        const disputed = conflictDays.includes(day);
        return (
          <span
            className={clsx(
              "grid h-6 w-6 place-items-center rounded-md text-xs font-bold tabular-nums",
              disputed
                ? "border border-dashed border-warn bg-warn-soft text-warn"
                : scheduled
                  ? "bg-lantern text-lantern-fg"
                  : "bg-raised text-subtle",
              day === highlight && "ring-2 ring-fg ring-offset-1 ring-offset-surface",
            )}
            key={day}
          >
            {weekdayInitials[locale][index]}
          </span>
        );
      })}
    </span>
  );
}


function DateChips({
  locale,
  dates,
  counts,
  selectedDate,
  query,
  districtCode,
}: {
  locale: Locale;
  dates: string[];
  counts: Map<string, number>;
  selectedDate: string;
  query: string;
  districtCode: string;
}) {
  const today = getTaipeiToday();
  const c = copy[locale];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const windowStart = dates[0];

  useEffect(() => {
    const scroller = scrollerRef.current;
    const selected = selectedRef.current;
    if (!scroller || !selected) {
      return;
    }
    scroller.scrollLeft = Math.max(0, selected.offsetLeft - (scroller.clientWidth - selected.clientWidth) / 2);
  }, [selectedDate, windowStart]);

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{c.chooseDate}</legend>
      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 py-1" ref={scrollerRef}>
        {dates.map((date) => {
          const selected = date === selectedDate;
          const weekday = dayLabels[locale][getScheduleDay(date) as OpeningDay];
          const count = counts.get(date) ?? 0;
          return (
            <button
              aria-label={`${date === today ? `${c.today}，` : ""}${formatDecisionDate(date, locale)}，${c.dateCountLabel(count)}`}
              aria-pressed={selected}
              className={clsx(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm tabular-nums transition-colors",
                focusRing,
                selected
                  ? "border-fg bg-fg text-canvas"
                  : "border-edge bg-surface text-fg hover:border-fg",
              )}
              key={date}
              onClick={() => writeLocation({ pathname: "/", date, query, districtCode })}
              ref={selected ? selectedRef : undefined}
              type="button"
            >
              <span className="font-semibold">{date === today ? c.today : weekday}</span>
              <span className={clsx(selected ? "text-canvas/80" : "text-muted")}>{formatCompactDate(date, locale)}</span>
              <span
                className={clsx(
                  "rounded-full px-2 text-xs font-bold",
                  selected ? "bg-canvas/20" : count ? "bg-lantern/10 text-lantern" : "text-muted",
                )}
              >
                {c.dateCount(count)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function DecisionBadge({ decision, locale }: { decision: MarketDecision; locale: Locale }) {
  const tone = decisionTone(decision);
  const Icon = tone === "confirmed" ? CheckCircle2 : tone === "conflict" ? TriangleAlert : Clock3;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-extrabold",
        tone === "confirmed" && "bg-ok-soft text-ok",
        tone === "conflict" && "bg-warn-soft text-warn",
        tone === "degraded" && "bg-idle-soft text-idle",
      )}
    >
      <Icon aria-hidden="true" size={14} />
      {decisionLabel(decision, locale)}
    </span>
  );
}


// The 4:3 media tile stands in for a listing photo: the market's weekly schedule, drawn large.
function ScheduleTile({ market, decision, district, locale }: { market: TrustedMarket; decision: MarketDecision; district: TrustedDistrict; locale: Locale }) {
  const conflictDays = market.conflicts.flatMap((conflict) => conflict.days);
  const tone = decisionTone(decision);
  return (
    <div
      className={clsx(
        "relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-[20px] p-4",
        tone === "confirmed" && "bg-gradient-to-br from-lantern/35 via-lantern/20 to-gold/30",
        tone === "conflict" && "bg-gradient-to-br from-warn/35 to-warn-soft",
        tone === "degraded" && "bg-gradient-to-br from-idle/30 to-idle-soft",
      )}
    >
      <div className="absolute left-3 top-3">
        <span className="rounded-full bg-surface shadow-sm [&>span]:bg-transparent">
          <DecisionBadge decision={decision} locale={locale} />
        </span>
      </div>
      <span className="absolute right-3 top-3 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-fg shadow-sm">
        {district.shortName}
      </span>
      <span aria-hidden="true" className="grid grid-cols-7 gap-1">
        {OPENING_DAYS.map((day, index) => {
          const scheduled = market.scheduleDays.includes(day);
          const disputed = conflictDays.includes(day);
          return (
            <span
              className={clsx(
                "grid aspect-square place-items-center rounded-lg text-sm font-bold",
                disputed
                  ? "border border-dashed border-warn bg-surface text-warn"
                  : scheduled
                    ? "bg-lantern text-lantern-fg"
                    : "bg-surface/70 text-muted",
                day === decision.day && "ring-2 ring-fg ring-offset-2 ring-offset-transparent",
              )}
              key={day}
            >
              {weekdayInitials[locale][index]}
            </span>
          );
        })}
      </span>
    </div>
  );
}

function MarketCard({
  market,
  district,
  decision,
  date,
  query,
  districtCode,
  locale,
}: {
  market: TrustedMarket;
  district: TrustedDistrict;
  decision: MarketDecision;
  date: string;
  query: string;
  districtCode: string;
  locale: Locale;
}) {
  const c = copy[locale];
  const scheduleEvidence = market.evidence.scheduleDays[0];
  const url = appUrl(
    `/market/${encodeURIComponent(market.id)}`,
    new URLSearchParams({
      date,
      ...(query ? { q: query } : {}),
      ...(districtCode ? { district: districtCode } : {}),
    }),
  );

  return (
    <article className="group flex flex-col">
      <ScheduleTile decision={decision} district={district} locale={locale} market={market} />
      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-fg">{market.name}</h3>
        <span className="shrink-0 text-base text-fg">{scheduleText(market.scheduleDays, locale)}</span>
      </div>
      <p className="line-clamp-1 text-base text-muted">{market.permittedArea}</p>
      <p className="text-sm text-muted">
        {scheduleEvidence.publisher} · {c.checkedAt} {formatEvidenceDate(scheduleEvidence.verifiedAt, locale)}
      </p>
      <a
        className={clsx(
          "mt-1 inline-flex min-h-11 items-center gap-1 self-start rounded-sm text-base font-semibold text-fg underline underline-offset-4 transition-colors hover:text-lantern",
          focusRing,
        )}
        href={url}
        onClick={(event) => {
          event.preventDefault();
          writeLocation({ pathname: `/market/${market.id}`, date, query, districtCode });
        }}
      >
        {c.details}
        <ChevronRight aria-hidden="true" size={16} />
      </a>
    </article>
  );
}

type StatusFilter = "all" | "confirmed" | "check";

function StatusChips({
  locale,
  value,
  onChange,
  counts,
}: {
  locale: Locale;
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}) {
  const c = copy[locale];
  const options: [StatusFilter, string][] = [
    ["all", c.statusAll],
    ["confirmed", c.statusConfirmed],
    ["check", c.statusCheck],
  ];
  return (
    <div aria-label={c.statusLabel} className="flex flex-wrap gap-2 sm:gap-2" role="group">
      {options.map(([option, label]) => (
        <button
          aria-pressed={value === option}
          className={clsx(
            "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-bold transition-colors sm:gap-2 sm:px-4 sm:text-sm",
            focusRing,
            value === option
              ? "border-fg bg-fg text-canvas"
              : "border-edge bg-surface text-muted hover:border-lantern/60 hover:text-fg",
          )}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option === "confirmed" ? <CheckCircle2 aria-hidden="true" className="hidden sm:block" size={15} /> : null}
          {option === "check" ? <TriangleAlert aria-hidden="true" className="hidden sm:block" size={15} /> : null}
          {label}
          <span className="tabular-nums opacity-70">{counts[option]}</span>
        </button>
      ))}
    </div>
  );
}


function DistrictMap({
  locale,
  candidateCounts,
  registeredCounts,
  selectedCode,
  onSelect,
}: {
  locale: Locale;
  candidateCounts: Map<string, number>;
  registeredCounts: Map<string, number>;
  selectedCode: string;
  onSelect: (code: string) => void;
}) {
  const c = copy[locale];
  // Phones get a compact, read-only overview (tiles would be under 44px); the
  // district select in the search capsule does the filtering there.
  const interactive = useMediaQuery("(min-width: 1024px)");
  return (
    <section
      aria-labelledby="district-map-title"
      className="flex h-full flex-col bg-raised px-4 py-6 lg:rounded-[20px] lg:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-fg" id="district-map-title">
          {c.mapTitle}
        </h2>
        {selectedCode ? (
          <button
            className={clsx("-my-3 min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-fg underline underline-offset-4", focusRing)}
            onClick={() => onSelect("")}
            type="button"
          >
            {c.mapShowAll}
          </button>
        ) : null}
      </div>
      <p className="mt-1 hidden text-sm text-muted lg:block">{c.mapNote}</p>
      <div className="flex flex-1 items-center justify-center py-3 lg:py-4">
        <div
          className="grid w-full max-w-[240px] gap-1 lg:max-w-[460px]"
          style={{
            gridTemplateColumns: `repeat(${DISTRICT_TILE_COLUMNS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${DISTRICT_TILE_ROWS}, minmax(0, 1fr))`,
          }}
        >
          {districtDataset.districts.map((district) => {
            const tile = districtTiles[district.shortName];
            if (!tile) {
              return null;
            }
            const count = candidateCounts.get(district.code) ?? 0;
            const registered = registeredCounts.get(district.code) ?? 0;
            const label = district.shortName.length > 2 ? district.shortName.replace(/區$/u, "") : district.shortName;
            const style = { gridColumn: tile.col + 1, gridRow: tile.row + 1 };
            if (!registered || !interactive) {
              return (
                <div
                  aria-hidden="true"
                  className={clsx(
                    "grid aspect-square place-items-center rounded-md text-xs",
                    !registered && "text-muted",
                    registered && count && "bg-lantern font-bold text-lantern-fg",
                    registered && !count && "border border-edge bg-surface text-fg",
                  )}
                  key={district.code}
                  style={style}
                >
                  {label}
                </div>
              );
            }
            const selected = selectedCode === district.code;
            return (
              <button
                aria-label={c.mapTile(district.shortName, count, registered)}
                aria-pressed={selected}
                className={clsx(
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-bold leading-tight transition",
                  focusRing,
                  count
                    ? "bg-lantern text-lantern-fg shadow-sm hover:brightness-110"
                    : "border border-edge bg-surface text-fg hover:border-fg",
                  selected && "ring-2 ring-fg ring-offset-2 ring-offset-raised",
                )}
                key={district.code}
                onClick={() => onSelect(selected ? "" : district.code)}
                style={style}
                type="button"
              >
                <span>{label}</span>
                {count ? <span className="text-xs font-bold tabular-nums">{count}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-xs bg-lantern" />
          {c.mapLegendOpen}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-xs border border-edge bg-surface" />
          {c.mapLegendRegistered}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-xs border border-dashed border-muted" />
          {c.mapLegendNone}
        </li>
      </ul>
    </section>
  );
}

const textLinkClass = clsx(
  "inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-bold text-lantern underline decoration-lantern/40 underline-offset-4 transition-colors hover:decoration-lantern",
  focusRing,
);

function SourceSummary({ headingId, locale }: { headingId: string; locale: Locale }) {
  const c = copy[locale];
  return (
    <aside className="rounded-2xl border border-edge bg-raised/60 p-4 lg:p-6" aria-labelledby={headingId}>
      <div className="flex gap-3">
        <Database aria-hidden="true" className="mt-1 shrink-0 text-lantern" size={20} />
        <div>
          <h2 className="font-extrabold text-fg" id={headingId}>
            {c.sourceScopeTitle}
          </h2>
          <p className="mt-1 text-base text-muted">{c.sourceScope(marketDataset.markets.length)}</p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold text-subtle">
            <div>
              <dt className="inline">{c.sourceChecked}：</dt>{" "}
              <dd className="inline">{formatEvidenceDate(marketDataset.source.retrievedAt, locale)}</dd>
            </div>
            <div>
              <dt className="inline">{c.sourceUpdated}：</dt>{" "}
              <dd className="inline">
                {marketDataset.source.sourceUpdatedAt
                  ? formatEvidenceDate(marketDataset.source.sourceUpdatedAt, locale)
                  : c.sourceUpdatedUnknown}
              </dd>
            </div>
          </dl>
          <div className="mt-2 flex flex-col items-start">
            <a className={textLinkClass} href={marketDataset.source.datasetUrl} rel="noreferrer" target="_blank">
              {c.sourcePage}
              <ExternalLink aria-hidden="true" size={14} />
            </a>
            <a className={textLinkClass} href={districtDataset.source.datasetUrl} rel="noreferrer" target="_blank">
              {c.districtSourcePage}
              <ExternalLink aria-hidden="true" size={14} />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}

function isCandidate(decision: MarketDecision) {
  return (
    decision.status === "confirmed" ||
    decision.status === "conflict" ||
    (["stale", "unknown"].includes(decision.status) && decision.scheduledByPrimarySource)
  );
}


function HomeView({ locale, location }: { locale: Locale; location: LocationState }) {
  const c = copy[locale];
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const selectedDay = getScheduleDay(location.date) as OpeningDay;
  const collator = locale === "zh" ? "zh-TW" : "en-US";
  const normalizedQuery = location.query.toLocaleLowerCase(collator);
  const today = getTaipeiToday();
  const currentWindow = getDateChoices(today);
  const dates = currentWindow.includes(location.date) ? currentWindow : getDateChoices(location.date);

  const queryMatches = useMemo(
    () =>
      marketDataset.markets
        .map((market) => ({ market, district: getDistrict(market.adminCode) }))
        .filter(({ market, district }) =>
          normalizedQuery
            ? `${market.name} ${market.permittedArea} ${district.fullName} ${district.shortName}`
                .toLocaleLowerCase(collator)
                .includes(normalizedQuery)
            : true,
        ),
    [collator, normalizedQuery],
  );
  const filtered = useMemo(
    () =>
      queryMatches.filter(
        ({ market }) => !location.districtCode || market.adminCode === location.districtCode,
      ),
    [location.districtCode, queryMatches],
  );
  const decisions = useMemo(
    () =>
      filtered.map(({ market, district }) => ({
        market,
        district,
        decision: getMarketDecision(market, selectedDay),
      })),
    [filtered, selectedDay],
  );
  const confirmed = decisions.filter(({ decision }) => decision.status === "confirmed");
  const needsCheck = decisions.filter(
    ({ decision }) => decision.status !== "confirmed" && isCandidate(decision),
  );
  const hasHardStaleData = decisions.some(
    ({ decision }) => decision.freshness.status === "hard-stale",
  );
  const visible =
    statusFilter === "confirmed"
      ? confirmed
      : statusFilter === "check"
        ? needsCheck
        : [...confirmed, ...needsCheck];

  // The headline answers "tonight" for the whole register, independent of search filters.
  const headline = useMemo(() => {
    const all = marketDataset.markets.map((market) => getMarketDecision(market, selectedDay));
    return {
      confirmed: all.filter((decision) => decision.status === "confirmed").length,
      needsCheck: all.filter((decision) => decision.status !== "confirmed" && isCandidate(decision)).length,
      freshness: all[0]?.freshness,
    };
  }, [selectedDay]);

  const dateCounts = useMemo(
    () =>
      new Map(
        dates.map((date) => {
          const day = getScheduleDay(date) as OpeningDay;
          return [
            date,
            filtered.filter(({ market }) => getMarketDecision(market, day).status === "confirmed").length,
          ];
        }),
      ),
    [dates, filtered],
  );

  const { candidateCounts, registeredCounts } = useMemo(() => {
    const candidates = new Map<string, number>();
    const registered = new Map<string, number>();
    for (const market of marketDataset.markets) {
      registered.set(market.adminCode, (registered.get(market.adminCode) ?? 0) + 1);
    }
    for (const { market } of queryMatches) {
      if (isCandidate(getMarketDecision(market, selectedDay))) {
        candidates.set(market.adminCode, (candidates.get(market.adminCode) ?? 0) + 1);
      }
    }
    return { candidateCounts: candidates, registeredCounts: registered };
  }, [queryMatches, selectedDay]);

  useEffect(() => {
    setPageMetadata(
      `${formatDecisionDate(location.date, locale)} · ${c.brand}`,
      c.intro,
      "/",
    );
  }, [c.brand, c.intro, locale, location.date]);

  useEffect(() => {
    if (!location.invalidDistrictCode) {
      return;
    }
    const params = new URLSearchParams();
    params.set("date", location.date);
    if (location.query) {
      params.set("q", location.query);
    }
    window.history.replaceState({}, "", appUrl("/", params));
  }, [location.date, location.invalidDistrictCode, location.query]);

  const selectDistrict = (code: string) => {
    writeLocation(
      { pathname: "/", date: location.date, query: location.query, districtCode: code },
      { replace: true, scroll: false },
    );
  };

  return (
    <>
      <div className="border-b border-edge bg-canvas">
        <div className={clsx(pageContainer, "py-3")}>
          <DateChips
            counts={dateCounts}
            dates={dates}
            districtCode={location.districtCode}
            locale={locale}
            query={location.query}
            selectedDate={location.date}
          />
        </div>
      </div>

      <div className={clsx(pageContainer, "lg:grid lg:grid-cols-[minmax(0,638fr)_minmax(0,658fr)] lg:gap-12 lg:pt-8")}>
        <div className="-mx-4 sm:-mx-6 lg:order-2 lg:mx-0">
          <div className="lg:sticky lg:top-[120px] lg:h-[calc(100vh-152px)]">
            <DistrictMap
              candidateCounts={candidateCounts}
              locale={locale}
              onSelect={selectDistrict}
              registeredCounts={registeredCounts}
              selectedCode={location.districtCode}
            />
          </div>
        </div>

        <section
          aria-labelledby="results-title"
          className="relative -mx-4 -mt-6 rounded-t-3xl bg-canvas px-4 pb-12 pt-4 shadow-[0_-6px_16px_rgb(0_0_0/0.08)] sm:-mx-6 sm:px-6 lg:order-1 lg:mx-0 lg:mt-0 lg:rounded-none lg:px-0 lg:pt-0 lg:shadow-none"
        >
          <span aria-hidden="true" className="mx-auto mb-4 block h-1 w-10 rounded-full bg-edge lg:hidden" />
          <p className="text-base font-semibold text-muted">
            {location.date === today ? `${c.tonight} · ` : ""}
            {formatDecisionDate(location.date, locale)} · {c.city}
          </p>
          <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="text-4xl font-black tracking-tight tabular-nums text-lantern sm:text-5xl">
              {headline.confirmed}
            </span>
            <span className="text-lg font-semibold text-fg sm:text-xl">{c.heroUnit}</span>
          </h1>
          {headline.needsCheck ? (
            <p className="mt-1 flex items-center gap-2 text-base font-semibold text-warn">
              <TriangleAlert aria-hidden="true" size={16} />
              {c.heroNeedsCheck(headline.needsCheck)}
            </p>
          ) : null}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <ShieldCheck aria-hidden="true" className="text-ok" size={16} />
            {headline.freshness
              ? c.heroFreshness(formatEvidenceDate(headline.freshness.verifiedAt, locale), headline.freshness.ageDays)
              : null}
            <span aria-hidden="true">·</span>
            {c.introShort}
          </p>

          <div className="mt-4 flex flex-col gap-3 border-t border-edge pt-4">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-lg font-semibold text-fg" id="results-title">
                {c.resultsTitle}
              </h2>
              <p aria-live="polite" className="text-sm tabular-nums text-muted">
                {c.resultsSummary(confirmed.length, needsCheck.length)}
              </p>
            </div>
            <StatusChips
              counts={{
                all: confirmed.length + needsCheck.length,
                confirmed: confirmed.length,
                check: needsCheck.length,
              }}
              locale={locale}
              onChange={setStatusFilter}
              value={statusFilter}
            />
          </div>

          {hasHardStaleData ? (
            <div className="mt-6 flex gap-3 rounded-2xl border border-warn/40 bg-warn-soft p-4 text-warn" role="status">
              <TriangleAlert aria-hidden="true" className="mt-1 shrink-0" size={20} />
              <p className="text-base font-semibold">{c.staleDatasetNotice}</p>
            </div>
          ) : null}

          {location.invalidDistrictCode ? (
            <div className="mt-6 flex gap-3 rounded-2xl border border-edge bg-idle-soft p-4 text-idle" role="status">
              <Info aria-hidden="true" className="mt-1 shrink-0" size={20} />
              <p className="text-base font-semibold">{c.invalidDistrict}</p>
            </div>
          ) : null}

          {visible.length ? (
            <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2">
              {visible.map(({ market, district, decision }) => (
                <MarketCard
                  date={location.date}
                  decision={decision}
                  district={district}
                  districtCode={location.districtCode}
                  key={market.id}
                  locale={locale}
                  market={market}
                  query={location.query}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[20px] bg-raised p-8 text-center">
              <CircleAlert aria-hidden="true" className="mx-auto text-muted" size={32} />
              <h3 className="mt-3 text-xl font-semibold text-fg">{c.noResults}</h3>
              <p className="mx-auto mt-2 max-w-xl text-base text-muted">{c.noResultsHint}</p>
              {location.query || location.districtCode ? (
                <button
                  className={clsx(
                    "mt-6 min-h-11 rounded-full bg-fg px-6 font-semibold text-canvas transition-colors hover:bg-lantern hover:text-lantern-fg",
                    focusRing,
                  )}
                  onClick={() => writeLocation({ pathname: "/", date: location.date, query: "", districtCode: "" })}
                  type="button"
                >
                  {c.clearFilters}
                </button>
              ) : null}
            </div>
          )}

          <div className="mt-12">
            <SourceSummary headingId="source-scope-title" locale={locale} />
          </div>
        </section>
      </div>
    </>
  );
}

function EvidenceItem<T>({
  evidence,
  fieldLabel,
  isDecisionStale = false,
  locale,
  selectedDateAgrees = false,
  valueText,
}: {
  evidence: FieldEvidence<T>;
  fieldLabel: string;
  isDecisionStale?: boolean;
  locale: Locale;
  selectedDateAgrees?: boolean;
  valueText: string;
}) {
  const c = copy[locale];
  const statusLabel =
    isDecisionStale
      ? c.stale
      : selectedDateAgrees
      ? c.selectedDateAgrees
      : evidence.status === "conflict"
        ? c.sourceValuesDiffer
      : evidence.status === "stale"
        ? c.stale
        : evidence.status === "unknown"
          ? c.unknown
          : c.sourceVerified;
  const displayStatus = isDecisionStale
    ? "stale"
    : selectedDateAgrees
      ? "verified"
      : evidence.status;
  return (
    <article
      className={clsx(
        "rounded-xl border border-l-4 border-edge bg-surface p-4",
        displayStatus === "verified" && "border-l-ok",
        displayStatus === "conflict" && "border-l-warn",
        displayStatus === "stale" && "border-l-bad",
        displayStatus === "unknown" && "border-l-idle",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-extrabold text-fg">{fieldLabel}</h4>
          <p className="mt-1 wrap-break-word text-base text-muted">
            {c.fieldValue}：{valueText}
          </p>
        </div>
        <span
          className={clsx(
            "rounded-full px-2 py-1 text-sm font-bold",
            displayStatus === "verified" && "bg-ok-soft text-ok",
            displayStatus === "conflict" && "bg-warn-soft text-warn",
            displayStatus === "stale" && "bg-bad-soft text-bad",
            displayStatus === "unknown" && "bg-idle-soft text-idle",
          )}
        >
          {statusLabel}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
        <div>
          <dt className="font-bold text-fg">{c.publisher}</dt>
          <dd>{evidence.publisher}</dd>
        </div>
        <div>
          <dt className="font-bold text-fg">{c.sourceLabel}</dt>
          <dd>{evidence.sourceLabel}</dd>
        </div>
      </dl>
      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-raised/70 p-3 text-sm text-muted">
        <div>
          <dt className="font-bold text-fg">{c.retrieved}</dt>
          <dd>{formatEvidenceDate(evidence.retrievedAt, locale)}</dd>
        </div>
        <div>
          <dt className="font-bold text-fg">{c.sourceUpdated}</dt>
          <dd>
            {evidence.sourceUpdatedAt
              ? formatEvidenceDate(evidence.sourceUpdatedAt, locale)
              : c.sourceUpdatedUnknown}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-fg">{c.verified}</dt>
          <dd>{formatEvidenceDate(evidence.verifiedAt, locale)}</dd>
        </div>
      </dl>
      {evidence.derivation ? (
        <p className="mt-3 text-sm leading-6 text-muted">
          <strong className="text-fg">{c.derivationLabel}：</strong>
          {evidence.derivation}
        </p>
      ) : null}
      <a className={clsx(textLinkClass, "mt-3")} href={evidence.sourceUrl} rel="noreferrer" target="_blank">
        {c.openSource}
        <ExternalLink aria-hidden="true" size={14} />
      </a>
    </article>
  );
}

function ShareAction({ market, date, locale }: { market: TrustedMarket; date: string; locale: Locale }) {
  const [status, setStatus] = useState<"idle" | "pending" | "shared" | "copied" | "error">("idle");
  const c = copy[locale];

  const share = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    setStatus("pending");
    try {
      if (navigator.share) {
        await navigator.share({ title: `${market.name} · ${formatDecisionDate(date, locale)}`, url: url.toString() });
        setStatus("shared");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url.toString());
        setStatus("copied");
      } else {
        setStatus("error");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
      } else {
        setStatus("error");
      }
    }
  };

  const statusMessage =
    status === "shared" ? c.shared : status === "copied" ? c.copied : status === "error" ? c.shareFailed : "";

  return (
    <div>
      <button
        className={clsx(
          "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-edge bg-surface px-4 font-extrabold text-fg transition-colors hover:border-fg disabled:cursor-wait disabled:opacity-60 sm:w-auto",
          focusRing,
        )}
        disabled={status === "pending"}
        onClick={share}
        type="button"
      >
        <Share2 aria-hidden="true" size={18} />
        {status === "pending" ? c.sharing : c.share}
      </button>
      <p aria-live="polite" className={clsx("mt-2 text-sm font-semibold", status === "error" ? "text-bad" : "text-ok")}>
        {statusMessage}
      </p>
    </div>
  );
}

function DetailView({
  market,
  locale,
  location,
}: {
  market: TrustedMarket;
  locale: Locale;
  location: LocationState;
}) {
  const c = copy[locale];
  const selectedDay = getScheduleDay(location.date) as OpeningDay;
  const decision = getMarketDecision(market, selectedDay);
  const district = getDistrict(market.adminCode);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(market.navigationQuery)}`;
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setPageMetadata(
      `${market.name} · ${formatDecisionDate(location.date, locale)} · ${c.brand}`,
      `${decisionLabel(decision, locale)}。${c.exceptionNote}`,
      `/market/${encodeURIComponent(market.id)}`,
    );
    mainRef.current?.focus({ preventScroll: true });
  }, [c.brand, c.exceptionNote, decision, locale, location.date, market.id, market.name]);

  return (
    <main id="main-content" ref={mainRef} tabIndex={-1}>
      <div className={clsx(pageContainer, "py-6 sm:py-12")}>
        <a
          className={clsx("inline-flex min-h-11 items-center gap-2 rounded-lg font-bold text-muted transition-colors hover:text-fg", focusRing)}
          href={appUrl("/", new URLSearchParams({ date: location.date, ...(location.query ? { q: location.query } : {}), ...(location.districtCode ? { district: location.districtCode } : {}) }))}
          onClick={(event) => {
            event.preventDefault();
            writeLocation({
              pathname: "/",
              date: location.date,
              query: location.query,
              districtCode: location.districtCode,
            });
          }}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          {c.back}
        </a>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <article className="overflow-hidden rounded-3xl border border-edge bg-surface shadow-xs">
            <div className="lantern-hero lantern-hero--plain px-4 py-8 sm:px-8">
              <DecisionBadge decision={decision} locale={locale} />
              <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.16em] text-[#ffc56b]">{c.decisionFor}</p>
              <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{market.name}</h1>
              <p className="mt-2 text-lg font-semibold text-white/80">{formatDecisionDate(location.date, locale)}</p>
            </div>

            <div className="p-4 sm:p-8">
              {decision.status === "conflict" ? (
                <div className="mb-6 flex gap-3 rounded-xl border border-warn/40 bg-warn-soft p-4 text-warn">
                  <TriangleAlert aria-hidden="true" className="mt-1 shrink-0" size={21} />
                  <p className="text-sm font-semibold leading-6">{c.conflictExplanation}</p>
                </div>
              ) : null}

              {decision.freshness.status === "hard-stale" ? (
                <div className="mb-6 flex gap-3 rounded-xl border border-bad/40 bg-bad-soft p-4 text-bad" role="status">
                  <Clock3 aria-hidden="true" className="mt-1 shrink-0" size={20} />
                  <p className="text-sm font-semibold leading-6">{c.staleDetailNotice}</p>
                </div>
              ) : null}

              <dl className="grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="flex items-center gap-2 text-sm font-extrabold text-subtle">
                    <MapPin aria-hidden="true" size={17} />
                    {c.district}
                  </dt>
                  <dd className="mt-1 text-xl font-extrabold text-fg">{district.shortName}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-sm font-extrabold text-subtle">
                    <CalendarDays aria-hidden="true" size={17} />
                    {c.schedule}
                  </dt>
                  <dd className="mt-1">
                    <span className="block text-xl font-extrabold text-fg">{scheduleText(market.scheduleDays, locale)}</span>
                    <span className="mt-2 block">
                      <WeekDots
                        conflictDays={market.conflicts.flatMap((conflict) => conflict.days)}
                        days={market.scheduleDays}
                        highlight={selectedDay}
                        locale={locale}
                      />
                    </span>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="flex items-center gap-2 text-sm font-extrabold text-subtle">
                    <MapPin aria-hidden="true" size={17} />
                    {c.permitArea}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-base leading-7 text-fg">{market.permittedArea}</dd>
                </div>
              </dl>

              <div className="mt-8 flex gap-3 rounded-xl bg-raised p-4">
                <Info aria-hidden="true" className="mt-1 shrink-0 text-muted" size={20} />
                <p className="text-sm font-semibold leading-6 text-muted">{c.exceptionNote}</p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start">
                <div>
                  <a
                    className={clsx(
                      "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-lantern px-6 font-extrabold text-lantern-fg shadow-md transition hover:brightness-110 sm:w-auto",
                      focusRing,
                    )}
                    href={mapsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Navigation aria-hidden="true" size={18} />
                    {c.map}
                    <ArrowUpRight aria-hidden="true" size={16} />
                  </a>
                  <p className="mt-2 text-sm font-semibold text-subtle">{c.mapDisclosure}</p>
                </div>
                <ShareAction date={location.date} locale={locale} market={market} />
              </div>
            </div>
          </article>

          <aside className="rounded-3xl border border-edge bg-raised/50 p-4 sm:p-6" aria-labelledby="evidence-title">
            <ShieldCheck aria-hidden="true" className="text-ok" size={26} />
            <h2 className="mt-3 text-2xl font-black text-fg" id="evidence-title">
              {c.evidenceTitle}
            </h2>
            <p className="mt-2 text-base text-muted">{c.evidenceIntro}</p>
            <h3 className="mt-6 text-sm font-extrabold uppercase tracking-wide text-subtle">{c.officialSchedule}</h3>
            <div className="mt-3 space-y-3">
              {market.evidence.scheduleDays.map((evidence) => (
                <EvidenceItem
                  evidence={evidence}
                  fieldLabel={c.schedule}
                  isDecisionStale={decision.status === "stale"}
                  key={`${evidence.sourceId}-${evidence.recordId}`}
                  locale={locale}
                  selectedDateAgrees={
                    evidence.status === "conflict" &&
                    !market.conflicts.some((conflict) => conflict.days.includes(selectedDay))
                  }
                  valueText={scheduleText(evidence.value, locale)}
                />
              ))}
            </div>
            <h3 className="mt-6 text-sm font-extrabold uppercase tracking-wide text-subtle">
              {c.otherEvidence}
            </h3>
            <div className="mt-3 space-y-3">
              <EvidenceItem
                evidence={market.evidence.adminCode}
                fieldLabel={c.districtCode}
                isDecisionStale={decision.status === "stale"}
                locale={locale}
                valueText={market.evidence.adminCode.value}
              />
              <EvidenceItem
                evidence={district.evidence}
                fieldLabel={c.district}
                locale={locale}
                valueText={district.fullName}
              />
              <EvidenceItem
                evidence={market.evidence.name}
                fieldLabel={c.fieldName}
                isDecisionStale={decision.status === "stale"}
                locale={locale}
                valueText={market.evidence.name.value}
              />
              <EvidenceItem
                evidence={market.evidence.permittedArea}
                fieldLabel={c.fieldPermitArea}
                isDecisionStale={decision.status === "stale"}
                locale={locale}
                valueText={market.evidence.permittedArea.value}
              />
              <EvidenceItem
                evidence={market.evidence.navigationQuery}
                fieldLabel={c.fieldNavigation}
                isDecisionStale={decision.status === "stale"}
                locale={locale}
                valueText={market.evidence.navigationQuery.value}
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function NotFoundView({ locale, location }: { locale: Locale; location: LocationState }) {
  const c = copy[locale];
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setPageMetadata(`${c.notFoundTitle} · ${c.brand}`, c.notFoundBody, "/");
    mainRef.current?.focus({ preventScroll: true });
  }, [c.brand, c.notFoundBody, c.notFoundTitle]);

  return (
    <main id="main-content" ref={mainRef} tabIndex={-1}>
      <section className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <CircleAlert aria-hidden="true" className="mx-auto text-lantern" size={38} />
        <h1 className="mt-4 text-3xl font-black text-fg">{c.notFoundTitle}</h1>
        <p className="mt-3 leading-7 text-muted">{c.notFoundBody}</p>
        <a
          className={clsx(
            "mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-fg px-6 font-extrabold text-canvas transition-colors hover:bg-lantern hover:text-lantern-fg",
            focusRing,
          )}
          href={appUrl("/", new URLSearchParams({ date: location.date }))}
          onClick={(event) => {
            event.preventDefault();
            writeLocation({
              pathname: "/",
              date: location.date,
              query: "",
              districtCode: location.districtCode,
            });
          }}
        >
          {c.home}
          <ChevronRight aria-hidden="true" size={18} />
        </a>
      </section>
    </main>
  );
}

function AppFooter({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const footerLink = clsx("inline-flex min-h-11 items-center gap-1 rounded-sm underline underline-offset-4 transition-colors hover:text-fg", focusRing);
  return (
    <footer className="mt-8 border-t border-edge bg-surface">
      <div className={clsx(pageContainer, "flex flex-col gap-3 py-8 text-sm text-muted")}>
        <p>{c.attribution}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-bold">
          <a className={footerLink} href="https://data.gov.tw/license" rel="noreferrer" target="_blank">
            Open Government Data License 1.0
            <ExternalLink aria-hidden="true" size={13} />
          </a>
          <a
            className={footerLink}
            href="https://github.com/livejiaquan/taiwan-night-market-finder/issues/new?template=data-correction.yml"
            rel="noreferrer"
            target="_blank"
          >
            {c.correction}
            <ExternalLink aria-hidden="true" size={13} />
          </a>
          <a
            className={footerLink}
            href="https://github.com/livejiaquan/taiwan-night-market-finder/blob/main/docs/PUBLIC_OPERABILITY.md"
            rel="noreferrer"
            target="_blank"
          >
            {c.privacy}
            <ExternalLink aria-hidden="true" size={13} />
          </a>
        </div>
        <p className="text-xs text-subtle">{c.lab}</p>
      </div>
    </footer>
  );
}

export default function TrustedApp() {
  const location = useLocationState();
  const [locale, setLocale] = useLocale();
  const previousPath = useRef(location.pathname);
  const selectedMarket = location.selectedMarketId
    ? marketDataset.markets.find((market) => market.id === location.selectedMarketId)
    : null;
  const showNotFound = location.isUnknownPath || (location.selectedMarketId !== null && !selectedMarket);

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.querySelector<HTMLElement>("#main-content")?.focus({ preventScroll: true });
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);

  return (
    <div className="product-shell min-h-screen">
      <a className="skip-link" href="#main-content">
        {copy[locale].skip}
      </a>
      <AppHeader
        center={!showNotFound && !selectedMarket ? <SearchPill locale={locale} location={location} /> : undefined}
        locale={locale}
        setLocale={setLocale}
      />
      {showNotFound ? (
        <NotFoundView locale={locale} location={location} />
      ) : selectedMarket ? (
        <DetailView locale={locale} location={location} market={selectedMarket} />
      ) : (
        <main id="main-content" tabIndex={-1}>
          <HomeView locale={locale} location={location} />
        </main>
      )}
      <AppFooter locale={locale} />
    </div>
  );
}
