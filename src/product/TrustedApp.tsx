import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  ExternalLink,
  Info,
  Languages,
  MapPin,
  Navigation,
  Search,
  Share2,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { appUrl, getAppLocation } from "../lib/basePath";
import {
  getMarketDecision,
  getFreshness,
  marketDataset,
  type FieldEvidence,
  type OpeningDay,
  type TrustedMarket,
} from "./marketData";
import { dayLabels, scheduleText } from "./scheduleText";
import { districtDataset, getDistrict, pilotDistricts, type TrustedDistrict } from "./districtData";
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
    otherDate: "指定日期",
    backToToday: "回到今天",
    dateHelp: "依臺灣時間（Asia/Taipei）查當日週期；不判斷跨午夜是否仍營業。",
    invalidDate: "連結中的日期無效，已改為臺灣時間的今天。",
    actualOpening: "所選日期現場營業",
    actualUnknown: "尚未確認",
    actualUnknownNote: "本產品未收錄這一天的開休市公告；週期排班不代表現場已開。",
    beforeLeaving: "出發前先確認",
    beforeLeavingNote: "先核對業者當日公告或最新現場資訊，再確認地圖位置。天候、臨時休市與個別攤商可能不同。",
    scheduleSources: "週期依據",
    checkedAge: (days: number) => `距比對 ${days} 天`,
    agingNote: "超過 30 天未重新比對",
    scheduledDay: "此星期有排班",
    unscheduledDay: "此星期未排班",
    needsCheckHelp: "來源分歧、過期或缺少依據，不能當成正常週期已確認。",
    regularHelp: "只確認正常週期；以下候選的當日現場營業仍未確認。",
    today: "今天",
    searchLabel: "搜尋夜市或許可區域",
    searchPlaceholder: "搜尋武聖、東區…",
    clearSearch: "清除搜尋",
    chooseDistrict: "行政區（選填）",
    allPilotDistricts: "全部本名冊行政區",
    districtHelp: "只依官方行政區代碼縮小候選；不是附近、距離或推薦排序。",
    invalidDistrict: "連結中的行政區條件無效，已改為顯示全部本名冊行政區。",
    clearFilters: "清除條件",
    confirmed: "正常週期候選",
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
    normalSchedule: "正常週期有排班",
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
      "部分週期依據已超過 90 天未重新比對；受影響項目只列入需再確認，不代表當日現場營業。",
    staleDetailNotice:
      "這個判斷的至少一項週期依據已超過 90 天未重新比對；即使另有來源衝突，出發前仍需重新確認。",
    conflictExplanation:
      "至少兩個臺南市政府來源對這一天的描述不同，因此不列入正常週期候選。",
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
    otherDate: "Specific date",
    backToToday: "Back to today",
    dateHelp: "Dates use Taiwan time (Asia/Taipei). Weekly schedules do not establish opening after midnight.",
    invalidDate: "The linked date is invalid. Showing today in Taiwan instead.",
    actualOpening: "Actual opening on this date",
    actualUnknown: "Not confirmed",
    actualUnknownNote: "No opening or closure announcement for this date is recorded here. A weekly schedule does not establish on-site opening.",
    beforeLeaving: "Confirm before leaving",
    beforeLeavingNote: "Check the operator’s announcement or recent on-site information, then confirm the map location. Weather, temporary closures and individual stalls may differ.",
    scheduleSources: "Schedule evidence",
    checkedAge: (days: number) => `Checked ${days} days ago`,
    agingNote: "Not rechecked for over 30 days",
    scheduledDay: "Scheduled on this weekday",
    unscheduledDay: "Not scheduled on this weekday",
    needsCheckHelp: "Conflicting, old or missing evidence cannot confirm the regular schedule.",
    regularHelp: "Only the weekly schedule is checked. Actual opening is still unconfirmed for every candidate below.",
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
    checkedAt: "Schedule checked",
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
      "Some schedule evidence has not been checked for over 90 days. Affected entries are shown only as needing confirmation, never as actual opening.",
    staleDetailNotice:
      "At least one schedule source behind this decision has gone unchecked for over 90 days. Confirm again before travel, even when a separate source conflict is shown.",
    conflictExplanation:
      "At least two Tainan City sources differ for this date, so this market is not placed in the regular-schedule group.",
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
  },
} as const;

interface LocationState {
  pathname: string;
  selectedMarketId: string | null;
  isUnknownPath: boolean;
  date: string;
  observedAt: number;
  invalidDate: boolean;
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
    observedAt: Date.now(),
    invalidDate: requestedDate !== null && !isIsoDate(requestedDate),
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
  options: { replace?: boolean; scroll?: boolean; followToday?: boolean } = {},
) {
  const params = new URLSearchParams();
  if (!options.followToday) params.set("date", next.date);
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
    const onVisible = () => {
      if (document.visibilityState === "visible") onPop();
    };
    const timer = window.setInterval(onPop, 60_000);
    window.addEventListener("popstate", onPop);
    window.addEventListener("focus", onPop);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("focus", onPop);
      document.removeEventListener("visibilitychange", onVisible);
    };
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

function decisionLabel(decision: Pick<MarketDecision, "status">, locale: Locale) {
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

function LanguageToggle({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <div
      aria-label={locale === "zh" ? "語言" : "Language"}
      className="inline-flex items-center rounded-lg border border-slate-300 bg-white p-1"
      role="group"
    >
      <Languages aria-hidden="true" className="mx-2 text-slate-500" size={16} />
      {(["zh", "en"] as const).map((option) => (
        <button
          aria-pressed={locale === option}
          className={clsx(
            "min-h-9 rounded-md px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600",
            locale === option ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100",
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

function AppHeader({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const c = copy[locale];
  return (
    <header className="border-b border-[#c8d5cf] bg-[#f6f7f2]/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <a
          className="flex items-center gap-3 rounded-md transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral-600"
          href={appUrl("/")}
          onClick={(event) => {
            event.preventDefault();
            writeLocation({ pathname: "/", date: getTaipeiToday(), query: "", districtCode: "" }, { followToday: true });
          }}
        >
          <span className="family-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>
            <span className="block text-[11px] font-extrabold tracking-[0.12em] text-plum-600">台灣生活資料誌</span>
            <span className="block text-lg font-extrabold tracking-tight text-ink">{c.brand}</span>
            <span className="block text-xs font-semibold text-moss-700">{c.pilot}</span>
          </span>
        </a>
        <LanguageToggle locale={locale} setLocale={setLocale} />
      </div>
    </header>
  );
}

function DatePicker({
  locale,
  selectedDate,
  query,
  districtCode,
}: {
  locale: Locale;
  selectedDate: string;
  query: string;
  districtCode: string;
}) {
  const today = getTaipeiToday();
  const currentWindow = getDateChoices(today);
  const dates = currentWindow.includes(selectedDate) ? currentWindow : getDateChoices(selectedDate);
  const c = copy[locale];
  const dateScrollerRef = useRef<HTMLDivElement>(null);
  const selectedDateRef = useRef<HTMLButtonElement>(null);
  const windowStart = dates[0];

  useEffect(() => {
    const scroller = dateScrollerRef.current;
    const selectedButton = selectedDateRef.current;
    if (!scroller || !selectedButton) {
      return;
    }

    // On wide layouts all seven dates fit in view. Resetting the horizontal
    // offset keeps the first and last dates visible after a user previously
    // selected a date on mobile, rather than leaving a misleading clipped row.
    if (typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1024px)").matches) {
      scroller.scrollLeft = 0;
      return;
    }

    scroller.scrollLeft = Math.max(
      0,
      selectedButton.offsetLeft - (scroller.clientWidth - selectedButton.clientWidth) / 2,
    );
  }, [selectedDate, windowStart]);

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
        <CalendarDays aria-hidden="true" size={17} />
        {c.chooseDate}
      </legend>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" ref={dateScrollerRef}>
        {dates.map((date) => {
          const selected = date === selectedDate;
          const weekday = dayLabels[locale][getScheduleDay(date) as OpeningDay];
          const calendarDate = formatCompactDate(date, locale);
          return (
            <button
              aria-label={`${date === today ? `${c.today}，` : ""}${formatDecisionDate(date, locale)}`}
              aria-pressed={selected}
              className={clsx(
                "min-h-[58px] min-w-[76px] shrink-0 rounded-xl border px-3 py-2 text-left tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 lg:min-w-[60px] lg:px-2",
                selected
                  ? "border-moss-700 bg-moss-700 text-white shadow-sm"
                  : "border-[#c8d5cf] bg-white/85 text-slate-700 hover:border-moss-600",
              )}
              key={date}
              onClick={() => writeLocation({ pathname: "/", date, query, districtCode }, { followToday: date === today })}
              ref={selected ? selectedDateRef : undefined}
              type="button"
            >
              <span className="block text-xs font-bold opacity-70">{date === today ? c.today : weekday}</span>
              <span className="mt-0.5 block whitespace-nowrap text-sm font-extrabold">
                {calendarDate}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="text-xs font-bold text-slate-700" htmlFor="decision-date">{c.otherDate}</label>
        <input
          className="min-h-11 min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
          id="decision-date"
          type="date"
          value={selectedDate}
          aria-describedby="decision-date-help"
          onChange={(event) => {
            if (isIsoDate(event.target.value)) {
              writeLocation({ pathname: "/", date: event.target.value, query, districtCode });
            }
          }}
        />
        {selectedDate !== today ? (
          <button className="min-h-11 rounded-lg px-2 text-sm font-bold text-moss-800 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
            type="button" onClick={() => writeLocation({ pathname: "/", date: today, query, districtCode }, { followToday: true })}>
            {c.backToToday}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600" id="decision-date-help">{c.dateHelp}</p>
    </fieldset>
  );
}

function DecisionBadge({ decision, locale }: { decision: MarketDecision; locale: Locale }) {
  const tone = decisionTone(decision);
  const Icon = tone === "confirmed" ? CalendarDays : tone === "conflict" ? TriangleAlert : Clock3;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold",
        tone === "confirmed" && "border-moss-300 bg-moss-50 text-moss-800",
        tone === "conflict" && "border-amber-300 bg-amber-50 text-amber-900",
        tone === "degraded" && "border-slate-300 bg-slate-100 text-slate-700",
      )}
    >
      <Icon aria-hidden="true" size={14} />
      {decisionLabel(decision, locale)}
    </span>
  );
}

function ActualOpening({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const c = copy[locale];
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" data-opening-status="unknown">
      <p className="text-sm font-semibold text-slate-600">{c.actualOpening}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
        <CircleAlert aria-hidden="true" size={15} />{c.actualUnknown}
      </p>
      {!compact ? <p className="mt-1 text-sm leading-6 text-slate-600">{c.actualUnknownNote}</p> : null}
    </div>
  );
}

function ScheduleEvidenceSummary({ market, decision, locale, compact = false }: {
  market: TrustedMarket; decision: MarketDecision; locale: Locale; compact?: boolean;
}) {
  const c = copy[locale];
  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <p className="text-sm font-extrabold text-slate-700">{c.scheduleSources}</p>
      <ul className="mt-2 space-y-3 text-sm leading-5 text-slate-600">
        {market.evidence.scheduleDays.map((evidence) => (
          <li key={`${evidence.sourceId}-${evidence.recordId}`}>
            <a className="inline-flex items-start gap-1 rounded font-bold text-moss-800 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
              href={evidence.sourceUrl} rel="noreferrer" target="_blank">
              {evidence.sourceLabel}<ExternalLink className="mt-1 shrink-0" aria-hidden="true" size={12} />
            </a>
            {decision.status === "conflict" ? <p className="font-bold text-amber-900">
              {dayLabels[locale][decision.day]}：{evidence.value.includes(decision.day) ? c.scheduledDay : c.unscheduledDay}
            </p> : null}
            <p>{c.checkedAt} <time dateTime={evidence.verifiedAt}>{formatEvidenceDate(evidence.verifiedAt, locale)}</time></p>
            {!compact ? <p>{c.sourceUpdated}：{evidence.sourceUpdatedAt ? formatEvidenceDate(evidence.sourceUpdatedAt, locale) : c.sourceUpdatedUnknown}</p> : null}
          </li>
        ))}
      </ul>
      <p className={clsx("mt-2 text-sm font-semibold", decision.freshness.status === "current" ? "text-slate-600" : "text-amber-900")}>
        {c.checkedAge(decision.freshness.ageDays)}{decision.freshness.status === "aging" ? ` · ${c.agingNote}` : ""}
      </p>
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
  const url = appUrl(
    `/market/${encodeURIComponent(market.id)}`,
    new URLSearchParams({
      date,
      ...(query ? { q: query } : {}),
      ...(districtCode ? { district: districtCode } : {}),
    }),
  );

  return (
    <article className="group flex min-h-full flex-col rounded-2xl border border-[#c8d5cf] bg-white/90 p-5 shadow-[0_16px_45px_-36px_rgba(16,33,28,0.55)] transition hover:border-moss-500">
      <DecisionBadge decision={decision} locale={locale} />
      <h4 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950">{market.name}</h4>
      <ActualOpening compact locale={locale} />
      <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-700">
        <MapPin aria-hidden="true" className="mt-1 shrink-0 text-coral-600" size={16} />
        <div>
          <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            {district.shortName} · {c.permitArea}
          </span>
          <p className="line-clamp-3 mt-0.5">{market.permittedArea}</p>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 text-sm text-slate-700">
        <CalendarDays aria-hidden="true" className="shrink-0 text-plum-600" size={16} />
        <span>
          <strong>{c.schedule}：</strong>
          {scheduleText(market.scheduleDays, locale)}
        </span>
      </div>
      <div className="mt-auto">
        <ScheduleEvidenceSummary compact decision={decision} locale={locale} market={market} />
        <a
          className="mt-4 inline-flex min-h-11 w-full items-center justify-between rounded-lg bg-moss-700 px-4 font-bold text-white transition-colors hover:bg-moss-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-600"
          href={url}
          onClick={(event) => {
            event.preventDefault();
            writeLocation({ pathname: `/market/${market.id}`, date, query, districtCode });
          }}
        >
          {c.details}
          <ChevronRight aria-hidden="true" className="transition group-hover:translate-x-0.5" size={18} />
        </a>
      </div>
    </article>
  );
}

function SearchControl({
  locale,
  date,
  query,
  districtCode,
}: {
  locale: Locale;
  date: string;
  query: string;
  districtCode: string;
}) {
  const c = copy[locale];
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="market-search">
        {c.searchLabel}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={19} />
        <input
          className="min-h-12 w-full rounded-xl border border-[#c8d5cf] bg-white/90 py-2 pl-10 pr-11 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-moss-700 focus:ring-2 focus:ring-moss-200"
          id="market-search"
          name="market-search"
          autoComplete="off"
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
            className="absolute right-1.5 top-1/2 inline-flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
            onClick={() =>
              writeLocation(
                { pathname: "/", date, query: "", districtCode },
                { replace: true, scroll: false },
              )
            }
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DistrictControl({
  locale,
  date,
  query,
  districtCode,
}: {
  locale: Locale;
  date: string;
  query: string;
  districtCode: string;
}) {
  const c = copy[locale];
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="district-filter">
        {c.chooseDistrict}
      </label>
      <select
        className="min-h-12 w-full rounded-xl border border-[#c8d5cf] bg-white/90 px-3 py-2 text-base font-semibold text-slate-950 outline-none focus:border-moss-700 focus:ring-2 focus:ring-moss-200"
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
      <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-600">{c.districtHelp}</p>
    </div>
  );
}

function SourceSummary({ headingId, locale }: { headingId: string; locale: Locale }) {
  const c = copy[locale];
  return (
    <aside className="trust-panel rounded-2xl border p-5" aria-labelledby={headingId}>
      <div className="flex gap-3">
        <Database aria-hidden="true" className="mt-0.5 shrink-0 text-moss-700" size={22} />
        <div>
          <h2 className="font-extrabold text-slate-950" id={headingId}>
            {c.sourceScopeTitle}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">{c.sourceScope(marketDataset.markets.length)}</p>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-slate-600">
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
          <a
            className="mt-3 inline-flex items-center gap-1.5 rounded text-sm font-bold text-moss-700 underline decoration-moss-300 underline-offset-4 transition-colors hover:text-moss-900 hover:decoration-moss-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-600"
            href={marketDataset.source.datasetUrl}
            rel="noreferrer"
            target="_blank"
          >
            {c.sourcePage}
            <ExternalLink aria-hidden="true" size={14} />
          </a>
          <a
            className="mt-3 inline-flex items-center gap-1.5 rounded text-sm font-bold text-moss-700 underline decoration-moss-300 underline-offset-4 transition-colors hover:text-moss-900 hover:decoration-moss-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-600"
            href={districtDataset.source.datasetUrl}
            rel="noreferrer"
            target="_blank"
          >
            {c.districtSourcePage}
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        </div>
      </div>
    </aside>
  );
}

function HomeView({ locale, location }: { locale: Locale; location: LocationState }) {
  const c = copy[locale];
  const selectedDay = getScheduleDay(location.date) as OpeningDay;
  const normalizedQuery = location.query.toLocaleLowerCase(locale === "zh" ? "zh-TW" : "en-US");
  const decisions = useMemo(
    () =>
      marketDataset.markets
        .map((market) => ({ market, district: getDistrict(market.adminCode) }))
        .filter(({ market, district }) => {
          if (location.districtCode && market.adminCode !== location.districtCode) {
            return false;
          }
          return normalizedQuery
            ? `${market.name} ${market.permittedArea} ${district.fullName} ${district.shortName}`
                .toLocaleLowerCase(locale === "zh" ? "zh-TW" : "en-US")
                .includes(normalizedQuery)
            : true;
        })
        .map(({ market, district }) => ({
          market,
          district,
          decision: getMarketDecision(market, selectedDay, new Date(location.observedAt)),
        })),
    [locale, location.districtCode, location.observedAt, normalizedQuery, selectedDay],
  );
  const confirmed = decisions.filter(({ decision }) => decision.status === "confirmed");
  const needsCheck = decisions.filter(
    ({ decision }) =>
      decision.status === "conflict" ||
      (["stale", "unknown"].includes(decision.status) && decision.scheduledByPrimarySource),
  );
  const hasHardStaleData = decisions.some(
    ({ decision }) => decision.freshness.status === "hard-stale",
  );
  const visible = [...confirmed, ...needsCheck];

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

  return (
    <>
      <section className="trusted-hero border-b border-[#c8d5cf]">
        <div className="mx-auto grid w-full max-w-6xl gap-7 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-plum-600">{c.eyebrow}</p>
            <h1 className="mt-2 max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {formatDecisionDate(location.date, locale)}，{c.titleSuffix}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">{c.intro}</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-moss-200 bg-white/70 px-3 py-2 text-xs font-bold text-slate-700 lg:hidden">
              <ShieldCheck aria-hidden="true" className="shrink-0 text-moss-700" size={17} />
              <span>
                {marketDataset.markets.length} · {c.sourceChecked} {formatEvidenceDate(marketDataset.source.retrievedAt, locale)} · {c.upstreamUnknown}
              </span>
            </div>
          </div>
          <div className="hidden lg:block">
            <SourceSummary headingId="source-scope-title-desktop" locale={locale} />
          </div>
        </div>
      </section>

      <section className="filter-shell border-b" aria-label={c.chooseDate}>
        <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1.25fr_0.6fr_0.85fr] lg:px-8">
          <DatePicker
            districtCode={location.districtCode}
            locale={locale}
            query={location.query}
            selectedDate={location.date}
          />
          <DistrictControl
            date={location.date}
            districtCode={location.districtCode}
            locale={locale}
            query={location.query}
          />
          <SearchControl
            date={location.date}
            districtCode={location.districtCode}
            locale={locale}
            query={location.query}
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="results-title">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-moss-700">{c.confirmed}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink" id="results-title">
              {c.resultsTitle}
            </h2>
          </div>
          <p aria-live="polite" className="text-sm font-semibold tabular-nums text-slate-600">
            {c.resultsSummary(confirmed.length, needsCheck.length)}
          </p>
        </div>

        {hasHardStaleData ? (
          <div className="mt-5 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="status">
            <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
            <p className="text-sm font-semibold leading-6">{c.staleDatasetNotice}</p>
          </div>
        ) : null}

        {location.invalidDate ? (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950" role="status">{c.invalidDate}</p>
        ) : null}

        {location.invalidDistrictCode ? (
          <div className="mt-5 flex gap-3 rounded-xl border border-slate-300 bg-slate-100 p-4 text-slate-800" role="status">
            <Info aria-hidden="true" className="mt-0.5 shrink-0 text-slate-600" size={20} />
            <p className="text-sm font-semibold leading-6">{c.invalidDistrict}</p>
          </div>
        ) : null}

        {visible.length ? (
          <div className="space-y-8">
            {[{ title: c.confirmed, help: c.regularHelp, rows: confirmed }, { title: c.needsCheck, help: c.needsCheckHelp, rows: needsCheck }].filter((group) => group.rows.length > 0).map((group) => (
              <section className="mt-6" key={group.title} aria-label={group.title}>
                <h3 className="text-lg font-extrabold text-slate-900">{group.title} · {group.rows.length}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{group.help}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.rows.map(({ market, district, decision }) => (
                    <MarketCard date={location.date} decision={decision} district={district} districtCode={location.districtCode}
                      key={market.id} locale={locale} market={market} query={location.query} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <CircleAlert aria-hidden="true" className="mx-auto text-slate-500" size={30} />
            <h3 className="mt-3 text-xl font-extrabold text-slate-950">{c.noResults}</h3>
            <p className="mx-auto mt-2 max-w-xl leading-7 text-slate-600">{c.noResultsHint}</p>
            {location.query || location.districtCode ? (
              <button
                className="mt-5 min-h-11 rounded-lg bg-slate-950 px-4 font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                onClick={() =>
                  writeLocation({ pathname: "/", date: location.date, query: "", districtCode: "" })
                }
                type="button"
              >
                {c.clearFilters}
              </button>
            ) : null}
          </div>
        )}
        <div className="mt-8 lg:hidden">
          <SourceSummary headingId="source-scope-title-mobile" locale={locale} />
        </div>
      </section>
    </>
  );
}

function EvidenceItem<T>({
  evidence,
  fieldLabel,
  isEvidenceStale = false,
  locale,
  selectedDateAgrees = false,
  valueText,
}: {
  evidence: FieldEvidence<T>;
  fieldLabel: string;
  isEvidenceStale?: boolean;
  locale: Locale;
  selectedDateAgrees?: boolean;
  valueText: string;
}) {
  const c = copy[locale];
  const statusLabel =
    isEvidenceStale
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
  const displayStatus = isEvidenceStale
    ? "stale"
    : selectedDateAgrees
      ? "verified"
      : evidence.status;
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-extrabold text-slate-950">{fieldLabel}</h4>
          <p className="mt-1 text-sm text-slate-700">
            {c.fieldValue}：{valueText}
          </p>
        </div>
        <span
          className={clsx(
            "rounded-full border px-2 py-0.5 text-xs font-bold",
            displayStatus === "verified" &&
              "border-moss-300 bg-moss-50 text-moss-800",
            displayStatus === "conflict" &&
              "border-amber-300 bg-amber-50 text-amber-900",
            displayStatus === "stale" && "border-red-300 bg-red-50 text-red-800",
            displayStatus === "unknown" && "border-slate-300 bg-slate-100 text-slate-700",
          )}
        >
          {statusLabel}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="font-bold text-slate-800">{c.publisher}</dt>
          <dd>{evidence.publisher}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-800">{c.sourceLabel}</dt>
          <dd>{evidence.sourceLabel}</dd>
        </div>
      </dl>
      <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
        <div>
          <dt className="font-bold text-slate-800">{c.retrieved}</dt>
          <dd>{formatEvidenceDate(evidence.retrievedAt, locale)}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-800">{c.sourceUpdated}</dt>
          <dd>
            {evidence.sourceUpdatedAt
              ? formatEvidenceDate(evidence.sourceUpdatedAt, locale)
              : c.sourceUpdatedUnknown}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-800">{c.verified}</dt>
          <dd>{formatEvidenceDate(evidence.verifiedAt, locale)}</dd>
        </div>
      </dl>
      {evidence.derivation ? (
        <p className="mt-3 text-xs leading-5 text-slate-600">
          <strong className="text-slate-800">{c.derivationLabel}：</strong>
          {evidence.derivation}
        </p>
      ) : null}
      <a
        className="mt-3 inline-flex items-center gap-1.5 rounded text-sm font-bold text-orange-800 underline decoration-orange-300 underline-offset-4 transition-colors hover:text-orange-950 hover:decoration-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        href={evidence.sourceUrl}
        rel="noreferrer"
        target="_blank"
      >
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
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-extrabold text-slate-900 hover:border-slate-500 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:w-auto"
        disabled={status === "pending"}
        onClick={share}
        type="button"
      >
        <Share2 aria-hidden="true" size={18} />
        {status === "pending" ? c.sharing : c.share}
      </button>
      <p aria-live="polite" className={clsx("mt-2 text-sm font-semibold", status === "error" ? "text-red-700" : "text-emerald-700")}>
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
  const decision = getMarketDecision(market, selectedDay, new Date(location.observedAt));
  const district = getDistrict(market.adminCode);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(market.navigationQuery)}`;
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setPageMetadata(
      `${market.name} · ${formatDecisionDate(location.date, locale)} · ${c.brand}`,
      `${decisionLabel({ status: decision.status }, locale)}。${c.exceptionNote}`,
      `/market/${encodeURIComponent(market.id)}`,
    );
  }, [c.brand, c.exceptionNote, decision.status, locale, location.date, market.id, market.name]);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [market.id]);

  return (
    <main id="main-content" ref={mainRef} tabIndex={-1}>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <a
          className="inline-flex min-h-11 items-center gap-2 rounded-lg font-bold text-slate-700 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
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

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-ambient sm:p-7">
            <DecisionBadge decision={decision} locale={locale} />
            <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.1em] text-orange-700">{c.decisionFor}</p>
            <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">{market.name}</h1>
            <p className="mt-2 text-lg font-semibold text-slate-600">{formatDecisionDate(location.date, locale)}</p>

            <ActualOpening locale={locale} />

            {decision.status === "conflict" ? (
              <div className="mt-5 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={21} />
                <p className="text-sm font-semibold leading-6">{c.conflictExplanation}</p>
              </div>
            ) : null}

            {decision.freshness.status === "hard-stale" ? (
              <div className="mt-4 flex gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-950" role="status">
                <Clock3 aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
                <p className="text-sm font-semibold leading-6">{c.staleDetailNotice}</p>
              </div>
            ) : null}

            <dl className="mt-7 space-y-5">
              <div>
                <dt className="flex items-center gap-2 text-sm font-extrabold text-slate-600">
                  <MapPin aria-hidden="true" size={18} />
                  {c.district}
                </dt>
                <dd className="mt-1 text-xl font-extrabold text-slate-950">{district.shortName}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-sm font-extrabold text-slate-600">
                  <CalendarDays aria-hidden="true" size={18} />
                  {c.schedule}
                </dt>
                <dd className="mt-1 text-xl font-extrabold text-slate-950">{scheduleText(market.scheduleDays, locale)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-sm font-extrabold text-slate-600">
                  <MapPin aria-hidden="true" size={18} />
                  {c.permitArea}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-base leading-7 text-slate-800">{market.permittedArea}</dd>
              </div>
            </dl>

            <div className="mt-7 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex gap-3">
                <Info aria-hidden="true" className="mt-0.5 shrink-0 text-blue-800" size={20} />
                <p className="text-sm font-semibold leading-6 text-blue-950">{c.exceptionNote}</p>
              </div>
            </div>

            <ScheduleEvidenceSummary decision={decision} locale={locale} market={market} />
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-extrabold text-amber-950">{c.beforeLeaving}</h2>
              <p className="mt-1 text-sm leading-6 text-amber-950">{c.beforeLeavingNote}</p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div>
                <a
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 font-extrabold text-white hover:bg-coral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-600 sm:w-auto"
                  href={mapsUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Navigation aria-hidden="true" size={18} />
                  {c.map}
                  <ArrowUpRight aria-hidden="true" size={16} />
                </a>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">{c.mapDisclosure}</p>
              </div>
              <ShareAction date={location.date} locale={locale} market={market} />
            </div>
          </article>

          <aside className="trust-panel rounded-2xl border p-5 sm:p-6" aria-labelledby="evidence-title">
            <ShieldCheck aria-hidden="true" className="text-moss-700" size={26} />
            <h2 className="mt-3 text-2xl font-extrabold text-slate-950" id="evidence-title">
              {c.evidenceTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{c.evidenceIntro}</p>
            <h3 className="mt-6 text-sm font-extrabold uppercase tracking-wide text-slate-600">{c.officialSchedule}</h3>
            <div className="mt-3 space-y-3">
              {market.evidence.scheduleDays.map((evidence) => (
                <EvidenceItem
                  evidence={evidence}
                  fieldLabel={c.schedule}
                  isEvidenceStale={getFreshness(evidence.verifiedAt, new Date(location.observedAt)).status === "hard-stale"}
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
            <h3 className="mt-6 text-sm font-extrabold uppercase tracking-wide text-slate-600">
              {c.otherEvidence}
            </h3>
            <div className="mt-3 space-y-3">
              <EvidenceItem
                evidence={market.evidence.adminCode}
                fieldLabel={c.districtCode}
                isEvidenceStale={getFreshness(market.evidence.adminCode.verifiedAt, new Date(location.observedAt)).status === "hard-stale"}
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
                isEvidenceStale={getFreshness(market.evidence.name.verifiedAt, new Date(location.observedAt)).status === "hard-stale"}
                locale={locale}
                valueText={market.evidence.name.value}
              />
              <EvidenceItem
                evidence={market.evidence.permittedArea}
                fieldLabel={c.fieldPermitArea}
                isEvidenceStale={getFreshness(market.evidence.permittedArea.verifiedAt, new Date(location.observedAt)).status === "hard-stale"}
                locale={locale}
                valueText={market.evidence.permittedArea.value}
              />
              <EvidenceItem
                evidence={market.evidence.navigationQuery}
                fieldLabel={c.fieldNavigation}
                isEvidenceStale={getFreshness(market.evidence.navigationQuery.verifiedAt, new Date(location.observedAt)).status === "hard-stale"}
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
      <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <CircleAlert aria-hidden="true" className="mx-auto text-orange-700" size={38} />
        <h1 className="mt-4 text-3xl font-extrabold text-slate-950">{c.notFoundTitle}</h1>
        <p className="mt-3 leading-7 text-slate-600">{c.notFoundBody}</p>
        <a
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 font-extrabold text-white transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
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
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:px-6 lg:px-8">
        <p>{c.attribution}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 font-bold">
          <a
            className="inline-flex items-center gap-1 rounded underline underline-offset-4 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
            href="https://data.gov.tw/license"
            rel="noreferrer"
            target="_blank"
          >
            Open Government Data License 1.0
            <ExternalLink aria-hidden="true" size={13} />
          </a>
          <a
            className="inline-flex items-center gap-1 rounded underline underline-offset-4 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-coral-600"
            href="https://github.com/livejiaquan/taiwan-night-market-finder/issues/new?template=data-correction.yml"
            rel="noreferrer"
            target="_blank"
          >
            {c.correction}
            <ExternalLink aria-hidden="true" size={13} />
          </a>
          <a
            className="inline-flex items-center gap-1 rounded underline underline-offset-4 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-coral-600"
            href="https://github.com/livejiaquan/taiwan-night-market-finder/blob/main/docs/PUBLIC_OPERABILITY.md"
            rel="noreferrer"
            target="_blank"
          >
            {c.privacy}
            <ExternalLink aria-hidden="true" size={13} />
          </a>
        </div>
        <p className="text-xs text-slate-500">{c.lab}</p>
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
    <div className="product-shell min-h-screen text-slate-950">
      <a className="skip-link" href="#main-content">
        {copy[locale].skip}
      </a>
      <AppHeader locale={locale} setLocale={setLocale} />
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
