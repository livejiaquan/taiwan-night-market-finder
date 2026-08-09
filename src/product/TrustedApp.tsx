import { useEffect, useMemo, useRef, useState } from "react";
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
  Navigation,
  Search,
  Share2,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import {
  getMarketDecision,
  marketDataset,
  type FieldEvidence,
  type OpeningDay,
  type TrustedMarket,
} from "./marketData";
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

const dayLabels: Record<Locale, Record<OpeningDay, string>> = {
  zh: {
    Mon: "一",
    Tue: "二",
    Wed: "三",
    Thu: "四",
    Fri: "五",
    Sat: "六",
    Sun: "日",
  },
  en: {
    Mon: "Mon",
    Tue: "Tue",
    Wed: "Wed",
    Thu: "Thu",
    Fri: "Fri",
    Sat: "Sat",
    Sun: "Sun",
  },
};

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
    searchPlaceholder: "搜尋武聖、安南區…",
    clearSearch: "清除搜尋",
    confirmed: "依週期有營業",
    needsCheck: "需再確認",
    sourceChecked: "資料比對",
    upstreamUnknown: "來源未提供更新時間",
    resultsTitle: "可出發前再確認的候選",
    resultsSummary: (confirmed: number, needsCheck: number) =>
      `${confirmed} 個正常週期候選，${needsCheck} 個資料需再確認`,
    noResults: "這個條件下沒有可安全顯示的當日候選",
    noResultsHint: "可能是搜尋到的夜市在所選日期沒有排班；請清除搜尋或改選日期。",
    clearFilters: "清除搜尋",
    schedule: "正常營業日",
    permitArea: "許可路段或區域",
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
    attribution: "資料來源：臺南市政府經濟發展局，政府資料開放授權條款第 1 版。",
    lab: "視覺原型保留於 lab，不是公共首頁。",
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
    today: "Today",
    searchLabel: "Search a market or permitted area",
    searchPlaceholder: "Try 武聖 or 安南區…",
    clearSearch: "Clear search",
    confirmed: "Scheduled",
    needsCheck: "Needs checking",
    sourceChecked: "Data checked",
    upstreamUnknown: "Source update time unavailable",
    resultsTitle: "Candidates to confirm before leaving",
    resultsSummary: (confirmed: number, needsCheck: number) =>
      `${confirmed} scheduled candidates, ${needsCheck} needing confirmation`,
    noResults: "No same-day candidate can be shown safely for this search",
    noResultsHint: "The matching market may not be scheduled that day. Clear search or choose another date.",
    clearFilters: "Clear search",
    schedule: "Regular days",
    permitArea: "Permitted area",
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
    attribution: "Source: Economic Development Bureau, Tainan City Government. Open Government Data License 1.0.",
    lab: "The visual prototype remains in the lab and is not the public homepage.",
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
  query: string;
}

function readLocation(): LocationState {
  const pathname = window.location.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const params = new URLSearchParams(window.location.search);
  const requestedDate = params.get("date");
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
  };
}

function writeLocation(
  next: { pathname?: string; date: string; query: string },
  options: { replace?: boolean; scroll?: boolean } = {},
) {
  const params = new URLSearchParams();
  params.set("date", next.date);
  if (next.query) {
    params.set("q", next.query);
  }
  const url = `${next.pathname ?? window.location.pathname}?${params.toString()}`;

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
    canonical.href = new URL(canonicalPath, window.location.origin).toString();
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
  ogUrl?.setAttribute("content", new URL(canonicalPath, window.location.origin).toString());
}

function scheduleText(days: OpeningDay[], locale: Locale) {
  return days.map((day) => dayLabels[locale][day]).join(locale === "zh" ? "、" : ", ");
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
    <header className="border-b border-slate-900/10 bg-[#fffaf3]/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <a
          className="rounded-md transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600"
          href={`/?date=${getTaipeiToday()}`}
          onClick={(event) => {
            event.preventDefault();
            writeLocation({ pathname: "/", date: getTaipeiToday(), query: "" });
          }}
        >
          <span className="block text-lg font-extrabold tracking-tight text-slate-950">{c.brand}</span>
          <span className="block text-xs font-semibold text-orange-700">{c.pilot}</span>
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
}: {
  locale: Locale;
  selectedDate: string;
  query: string;
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
                "min-h-[58px] min-w-[76px] shrink-0 rounded-xl border px-3 py-2 text-left tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600",
                selected
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-500",
              )}
              key={date}
              onClick={() => writeLocation({ pathname: "/", date, query })}
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
    </fieldset>
  );
}

function DecisionBadge({ decision, locale }: { decision: MarketDecision; locale: Locale }) {
  const tone = decisionTone(decision);
  const Icon = tone === "confirmed" ? CheckCircle2 : tone === "conflict" ? TriangleAlert : Clock3;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold",
        tone === "confirmed" && "border-emerald-300 bg-emerald-50 text-emerald-800",
        tone === "conflict" && "border-amber-300 bg-amber-50 text-amber-900",
        tone === "degraded" && "border-slate-300 bg-slate-100 text-slate-700",
      )}
    >
      <Icon aria-hidden="true" size={14} />
      {decisionLabel(decision, locale)}
    </span>
  );
}

function MarketCard({
  market,
  decision,
  date,
  query,
  locale,
}: {
  market: TrustedMarket;
  decision: MarketDecision;
  date: string;
  query: string;
  locale: Locale;
}) {
  const c = copy[locale];
  const url = `/market/${encodeURIComponent(market.id)}?date=${date}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <article className="group flex min-h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_45px_-36px_rgba(15,23,42,0.65)] transition hover:border-slate-400">
      <DecisionBadge decision={decision} locale={locale} />
      <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950">{market.name}</h3>
      <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-700">
        <MapPin aria-hidden="true" className="mt-1 shrink-0 text-orange-700" size={16} />
        <div>
          <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{c.permitArea}</span>
          <p className="line-clamp-3 mt-0.5">{market.permittedArea}</p>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 text-sm text-slate-700">
        <CalendarDays aria-hidden="true" className="shrink-0 text-orange-700" size={16} />
        <span>
          <strong>{c.schedule}：</strong>
          {scheduleText(market.scheduleDays, locale)}
        </span>
      </div>
      <div className="mt-auto border-t border-slate-100 pt-5">
        <p className="mb-3 text-xs font-semibold text-slate-500">
          {c.checkedAt} {formatEvidenceDate(market.evidence.scheduleDays[0].verifiedAt, locale)}
        </p>
        <a
          className="inline-flex min-h-11 w-full items-center justify-between rounded-lg bg-slate-950 px-4 font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          href={url}
          onClick={(event) => {
            event.preventDefault();
            writeLocation({ pathname: `/market/${market.id}`, date, query });
          }}
        >
          {c.details}
          <ChevronRight aria-hidden="true" className="transition group-hover:translate-x-0.5" size={18} />
        </a>
      </div>
    </article>
  );
}

function SearchControl({ locale, date, query }: { locale: Locale; date: string; query: string }) {
  const c = copy[locale];
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="market-search">
        {c.searchLabel}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={19} />
        <input
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-11 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-orange-600 focus:ring-2 focus:ring-orange-200"
          id="market-search"
          name="market-search"
          autoComplete="off"
          onChange={(event) =>
            writeLocation(
              { pathname: "/", date, query: event.target.value },
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
            onClick={() => writeLocation({ pathname: "/", date, query: "" }, { replace: true, scroll: false })}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SourceSummary({ headingId, locale }: { headingId: string; locale: Locale }) {
  const c = copy[locale];
  return (
    <aside className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5" aria-labelledby={headingId}>
      <div className="flex gap-3">
        <Database aria-hidden="true" className="mt-0.5 shrink-0 text-orange-700" size={22} />
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
            className="mt-3 inline-flex items-center gap-1.5 rounded text-sm font-bold text-orange-800 underline decoration-orange-300 underline-offset-4 transition-colors hover:text-orange-950 hover:decoration-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            href={marketDataset.source.datasetUrl}
            rel="noreferrer"
            target="_blank"
          >
            {c.sourcePage}
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
        .filter((market) =>
          normalizedQuery
            ? `${market.name} ${market.permittedArea}`.toLocaleLowerCase().includes(normalizedQuery)
            : true,
        )
        .map((market) => ({ market, decision: getMarketDecision(market, selectedDay) })),
    [normalizedQuery, selectedDay],
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

  return (
    <>
      <section className="border-b border-slate-900/10 bg-[#fffaf3]">
        <div className="mx-auto grid w-full max-w-6xl gap-7 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-orange-700">{c.eyebrow}</p>
            <h1 className="mt-2 max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              {formatDecisionDate(location.date, locale)}，{c.titleSuffix}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">{c.intro}</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-slate-700 lg:hidden">
              <ShieldCheck aria-hidden="true" className="shrink-0 text-orange-700" size={17} />
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

      <section className="border-b border-slate-200 bg-white" aria-label={c.chooseDate}>
        <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1.35fr_0.65fr] lg:px-8">
          <DatePicker locale={locale} query={location.query} selectedDate={location.date} />
          <SearchControl date={location.date} locale={locale} query={location.query} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="results-title">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-orange-700">{c.confirmed}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-950" id="results-title">
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

        {visible.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(({ market, decision }) => (
              <MarketCard
                date={location.date}
                decision={decision}
                key={market.id}
                locale={locale}
                market={market}
                query={location.query}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <CircleAlert aria-hidden="true" className="mx-auto text-slate-500" size={30} />
            <h3 className="mt-3 text-xl font-extrabold text-slate-950">{c.noResults}</h3>
            <p className="mx-auto mt-2 max-w-xl leading-7 text-slate-600">{c.noResultsHint}</p>
            {location.query ? (
              <button
                className="mt-5 min-h-11 rounded-lg bg-slate-950 px-4 font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                onClick={() => writeLocation({ pathname: "/", date: location.date, query: "" })}
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
              "border-emerald-300 bg-emerald-50 text-emerald-800",
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
  const decision = getMarketDecision(market, selectedDay);
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
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <a
          className="inline-flex min-h-11 items-center gap-2 rounded-lg font-bold text-slate-700 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          href={`/?date=${location.date}${location.query ? `&q=${encodeURIComponent(location.query)}` : ""}`}
          onClick={(event) => {
            event.preventDefault();
            writeLocation({ pathname: "/", date: location.date, query: location.query });
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

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div>
                <a
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 font-extrabold text-white hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:w-auto"
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

          <aside className="rounded-2xl border border-slate-200 bg-[#fffaf3] p-5 sm:p-6" aria-labelledby="evidence-title">
            <ShieldCheck aria-hidden="true" className="text-orange-700" size={26} />
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
            <h3 className="mt-6 text-sm font-extrabold uppercase tracking-wide text-slate-600">
              {c.otherEvidence}
            </h3>
            <div className="mt-3 space-y-3">
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
      <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <CircleAlert aria-hidden="true" className="mx-auto text-orange-700" size={38} />
        <h1 className="mt-4 text-3xl font-extrabold text-slate-950">{c.notFoundTitle}</h1>
        <p className="mt-3 leading-7 text-slate-600">{c.notFoundBody}</p>
        <a
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 font-extrabold text-white transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          href={`/?date=${location.date}`}
          onClick={(event) => {
            event.preventDefault();
            writeLocation({ pathname: "/", date: location.date, query: "" });
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
    <div className="min-h-screen bg-[#f7f4ed] text-slate-950">
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
