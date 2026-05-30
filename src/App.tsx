import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeInfo,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCcw,
  Search,
  Sparkles,
  Train,
  Utensils,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { nightMarkets } from "./data/nightMarkets";
import {
  countActiveFilters,
  filterNightMarkets,
  getFilterOptions,
} from "./lib/marketFilters";
import { getMarketInsight } from "./lib/marketInsights";
import {
  formatMarketTitle,
  getStyleCopy,
  labelCity,
  labelConfidence,
  labelDay,
  labelTag,
  labelTransport,
  localize,
  uiCopy,
} from "./lib/i18n";
import type { DataStatus, Locale, NightMarket, NightMarketFilters, StyleId } from "./types";

const styleRoutes: Record<StyleId, string> = {
  neon: "/style/neon",
  travel: "/style/travel",
};

const styleIds: StyleId[] = ["neon", "travel"];

const defaultFilters: NightMarketFilters = {
  query: "",
  city: "",
  mood: "",
  foodType: "",
  transport: "",
  openingDay: undefined,
};

const parseRoute = () => {
  const segments = window.location.pathname.split("/").filter(Boolean);

  if (segments[0] === "style" && styleIds.includes(segments[1] as StyleId)) {
    return {
      mode: "style" as const,
      style: segments[1] as StyleId,
      selectedId: segments[2] === "market" ? segments[3] : undefined,
    };
  }

  return {
    mode: "compare" as const,
    style: "neon" as StyleId,
    selectedId: undefined,
  };
};

const navigateTo = (path: string, options: { scrollToTop?: boolean } = {}) => {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (options.scrollToTop ?? true) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

function useRouteState() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return route;
}

function useNightMarketData() {
  const [status, setStatus] = useState<DataStatus>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("data") === "error" ? "error" : "loading";
  });

  useEffect(() => {
    if (status === "error") {
      return;
    }

    const timer = window.setTimeout(() => setStatus("success"), 460);
    return () => window.clearTimeout(timer);
  }, [status]);

  return {
    status,
    markets: status === "success" ? nightMarkets : [],
    retry: () => setStatus("loading"),
    fail: () => setStatus("error"),
  };
}

function useLocaleState() {
  const [locale, setLocale] = useState<Locale>(() => {
    const savedLocale = localStorage.getItem("night-market-locale");
    return savedLocale === "en" || savedLocale === "zh" ? savedLocale : "zh";
  });

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hant" : "en";
    localStorage.setItem("night-market-locale", locale);
  }, [locale]);

  return [locale, setLocale] as const;
}

export default function App() {
  const route = useRouteState();
  const data = useNightMarketData();
  const [locale, setLocale] = useLocaleState();
  const [detailPulse, setDetailPulse] = useState(0);
  const [filters, setFilters] = useState<NightMarketFilters>(defaultFilters);

  const filterOptions = useMemo(() => getFilterOptions(nightMarkets), []);
  const filteredMarkets = useMemo(
    () => filterNightMarkets(data.markets, filters),
    [data.markets, filters],
  );

  const selectedMarket =
    nightMarkets.find((market) => market.id === route.selectedId) ??
    filteredMarkets[0] ??
    nightMarkets[0];

  const clearFilters = () =>
    setFilters({
      ...defaultFilters,
      openingDay: undefined,
    });

  const openMarket = (style: StyleId, id: string) => {
    setDetailPulse((value) => value + 1);
    navigateTo(`/style/${style}/market/${id}`, { scrollToTop: false });
  };

  const routeProps = {
    locale,
    setLocale,
    status: data.status,
    filters,
    setFilters,
    filterOptions,
    filteredMarkets,
    selectedMarket,
    clearFilters,
    retry: data.retry,
    openMarket,
    detailPulse,
  };

  if (route.mode === "compare") {
    return <StyleComparison {...routeProps} />;
  }

  if (route.style === "travel") {
    return <TravelExperience {...routeProps} styleId="travel" />;
  }

  return <NeonExperience {...routeProps} styleId="neon" />;
}

interface ExperienceProps {
  styleId: StyleId;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  status: DataStatus;
  filters: NightMarketFilters;
  setFilters: (filters: NightMarketFilters) => void;
  filterOptions: ReturnType<typeof getFilterOptions>;
  filteredMarkets: NightMarket[];
  selectedMarket: NightMarket;
  clearFilters: () => void;
  retry: () => void;
  openMarket: (style: StyleId, id: string) => void;
  detailPulse: number;
}

type SharedProps = Omit<ExperienceProps, "styleId">;

function StyleComparison(props: SharedProps) {
  const sourceMarkets = props.filteredMarkets.length > 2 ? props.filteredMarkets : nightMarkets;
  const samples = [sourceMarkets[1], sourceMarkets[10] ?? sourceMarkets[0]];
  const copy = uiCopy[props.locale];

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-slate-950">
      <section className="comparison-hero">
        <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-5 border-b border-slate-900/10 pb-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-900/15 bg-white/70 px-3 py-1 text-sm font-semibold text-slate-700">
                <Sparkles size={15} aria-hidden="true" />
                {copy.compareEyebrow}
              </div>
              <h1 className="text-balance text-4xl font-semibold tracking-[0] text-slate-950 sm:text-5xl lg:text-6xl">
                {copy.compareTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
                {copy.compareIntro}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <LanguageToggle locale={props.locale} setLocale={props.setLocale} tone="light" />
              <div className="grid grid-cols-3 gap-3 rounded-[8px] border border-slate-900/10 bg-white/80 p-3 shadow-ambient">
                <Metric value={nightMarkets.length.toString()} label={copy.markets} />
                <Metric value={props.filterOptions.cities.length.toString()} label={copy.cities} />
                <Metric value={styleIds.length.toString()} label={copy.styles} />
              </div>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-2">
            {styleIds.map((styleId, index) => (
              <ComparisonPanel
                key={styleId}
                styleId={styleId}
                sample={samples[index]}
                locale={props.locale}
                onOpen={() => navigateTo(styleRoutes[styleId])}
              />
            ))}
          </div>

          <FallbackNotice tone="light" locale={props.locale} />
        </div>
      </section>
    </main>
  );
}

function ComparisonPanel({
  styleId,
  sample,
  locale,
  onOpen,
}: {
  styleId: StyleId;
  sample: NightMarket;
  locale: Locale;
  onOpen: () => void;
}) {
  const meta = getStyleCopy(styleId, locale);
  const copy = uiCopy[locale];
  const marketTitle = formatMarketTitle(sample, locale);

  if (styleId === "neon") {
    return (
      <article className="relative min-h-[560px] overflow-hidden rounded-[8px] border border-cyan-300/25 bg-[#080914] p-4 text-white shadow-ambient">
        <HeroImageOverlay />
        <div className="relative z-10 flex h-full flex-col justify-between gap-5">
          <div>
            <span className="inline-flex rounded-full border border-fuchsia-300/40 bg-fuchsia-400/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-fuchsia-100">
              {meta.version} / {meta.label}
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-[0]">{meta.name}</h2>
            <p className="mt-3 text-sm leading-6 text-cyan-50/78">{meta.summary}</p>
          </div>
          <div className="rounded-[8px] border border-white/15 bg-black/45 p-4 backdrop-blur-xl">
            <p className="text-sm font-semibold text-cyan-100">{copy.tonightMatch}</p>
            <h3 className="mt-2 text-2xl font-semibold">{marketTitle.primary}</h3>
            <p className="mt-1 text-sm text-white/60">{marketTitle.secondary}</p>
            <TagRow tags={sample.foodTypes.slice(0, 3)} tone="neon" locale={locale} />
            <button className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-cyan-300 px-4 text-sm font-bold text-slate-950" onClick={onOpen}>
              {meta.openCta}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="min-h-[560px] rounded-[8px] border border-slate-200 bg-[#fbfbf8] p-5 shadow-ambient">
      <img
        src="/assets/night-market-hero.png"
        alt=""
        className="h-52 w-full rounded-[8px] object-cover"
      />
      <div className="mt-6">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
          {meta.version} / {meta.label}
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-[0] text-slate-950">
          {meta.name}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{meta.summary}</p>
      </div>
      <div className="mt-7 rounded-[8px] border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">{copy.curatedRoute}</p>
        <h3 className="mt-1 text-xl font-semibold text-slate-950">{marketTitle.primary}</h3>
        <p className="mt-1 text-sm text-slate-500">{marketTitle.secondary}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {sample.highlights.slice(0, 2).map((item) => localize(item, locale)).join(" / ")}
        </p>
      </div>
      <button className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-slate-950 px-4 text-sm font-semibold text-white" onClick={onOpen}>
        {meta.openCta}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </article>
  );
}

function NeonExperience(props: ExperienceProps) {
  const copy = uiCopy[props.locale];
  const meta = getStyleCopy("neon", props.locale);

  return (
    <main className="min-h-screen overflow-hidden bg-[#080914] text-white">
      <section className="relative">
        <HeroImageOverlay />
        <div className="relative z-10 mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <TopNav
            active="neon"
            tone="dark"
            selectedId={props.selectedMarket.id}
            locale={props.locale}
            setLocale={props.setLocale}
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:items-end">
            <div className="pt-8 sm:pt-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-sm font-bold text-cyan-100 shadow-glow">
                <Sparkles size={15} aria-hidden="true" />
                {meta.version} / {meta.name}
              </div>
              <h1 className="mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-[0] text-white sm:text-6xl lg:text-7xl">
                {meta.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-cyan-50/78">
                {meta.heroBody}
              </p>
            </div>
            <div className="rounded-[8px] border border-white/15 bg-black/45 p-4 shadow-glow backdrop-blur-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-fuchsia-100">
                {copy.liveCore}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Metric value={props.filteredMarkets.length.toString()} label={copy.matches} tone="dark" />
                <Metric value={countActiveFilters(props.filters).toString()} label={copy.filters} tone="dark" />
                <Metric value={labelCity(props.selectedMarket.city, props.locale)} label={copy.focus} tone="dark" />
              </div>
            </div>
          </div>

          <FilterBar
            filters={props.filters}
            setFilters={props.setFilters}
            options={props.filterOptions}
            clearFilters={props.clearFilters}
            tone="neon"
            locale={props.locale}
          />
          <FallbackNotice tone="dark" locale={props.locale} />
        </div>
      </section>

      <StateFrame
        status={props.status}
        retry={props.retry}
        empty={props.filteredMarkets.length === 0}
        clearFilters={props.clearFilters}
        tone="dark"
        locale={props.locale}
      >
        <section className="mx-auto grid max-w-[1480px] gap-5 px-4 pb-12 pt-2 sm:px-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:px-8">
          <div className="grid auto-rows-max content-start items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {props.filteredMarkets.map((market, index) => (
              <MarketCard
                key={market.id}
                market={market}
                index={index}
                styleId="neon"
                locale={props.locale}
                active={market.id === props.selectedMarket.id}
                onOpen={props.openMarket}
              />
            ))}
          </div>
          <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
            <div className="order-2 h-72 overflow-hidden rounded-[8px] border border-cyan-300/20 bg-black/35 shadow-glow lg:order-1">
              <TaiwanMap
                markets={props.filteredMarkets}
                selectedMarket={props.selectedMarket}
                onSelect={(market) => props.openMarket("neon", market.id)}
                tone="neon"
                locale={props.locale}
              />
            </div>
            <div className="order-1 lg:order-2">
              <DetailPanel
                market={props.selectedMarket}
                styleId="neon"
                locale={props.locale}
                pulseKey={props.detailPulse}
              />
            </div>
          </aside>
        </section>
      </StateFrame>
    </main>
  );
}

function TravelExperience(props: ExperienceProps) {
  const copy = uiCopy[props.locale];
  const meta = getStyleCopy("travel", props.locale);

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-slate-950">
      <header className="mx-auto flex max-w-[1480px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <TopNav
          active="travel"
          tone="light"
          selectedId={props.selectedMarket.id}
          locale={props.locale}
          setLocale={props.setLocale}
        />
        <div className="grid gap-8 border-b border-slate-200 pb-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(400px,0.7fr)] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/15 bg-white px-3 py-1 text-sm font-semibold text-emerald-800 shadow-sm">
              <Compass size={15} aria-hidden="true" />
              {meta.version} / {meta.name}
            </div>
            <h1 className="mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-[0] text-slate-950 sm:text-6xl">
              {meta.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              {meta.heroBody}
            </p>
          </div>
          <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-ambient">
            <img
              src="/assets/night-market-hero.png"
              alt=""
              className="h-72 w-full object-cover"
            />
            <div className="grid grid-cols-3 gap-0 border-t border-slate-200">
              <Metric value={props.filteredMarkets.length.toString()} label={copy.matches} />
              <Metric value={labelCity(props.selectedMarket.city, props.locale)} label={copy.city} />
              <Metric value={props.selectedMarket.walkingMinutes.toString()} label={copy.minWalk} />
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <FilterBar
          filters={props.filters}
          setFilters={props.setFilters}
          options={props.filterOptions}
          clearFilters={props.clearFilters}
          tone="travel"
          locale={props.locale}
        />
        <FallbackNotice tone="light" locale={props.locale} />
      </section>

      <StateFrame
        status={props.status}
        retry={props.retry}
        empty={props.filteredMarkets.length === 0}
        clearFilters={props.clearFilters}
        tone="light"
        locale={props.locale}
      >
        <section className="mx-auto grid max-w-[1480px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
          <div className="grid auto-rows-max content-start items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
            {props.filteredMarkets.map((market, index) => (
              <MarketCard
                key={market.id}
                market={market}
                index={index}
                styleId="travel"
                locale={props.locale}
                active={market.id === props.selectedMarket.id}
                onOpen={props.openMarket}
              />
            ))}
          </div>
          <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            <DetailPanel
              market={props.selectedMarket}
              styleId="travel"
              locale={props.locale}
              pulseKey={props.detailPulse}
            />
            <div className="h-80 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
              <TaiwanMap
                markets={props.filteredMarkets}
                selectedMarket={props.selectedMarket}
                onSelect={(market) => props.openMarket("travel", market.id)}
                tone="travel"
                locale={props.locale}
              />
            </div>
          </aside>
        </section>
      </StateFrame>
    </main>
  );
}

function TopNav({
  active,
  tone,
  selectedId,
  locale,
  setLocale,
}: {
  active?: StyleId;
  tone: "dark" | "light" | "utility";
  selectedId?: string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}) {
  const isDark = tone === "dark";
  const copy = uiCopy[locale];
  const itemClass = (styleId: StyleId) =>
    clsx(
      "inline-flex min-h-10 shrink-0 flex-col items-start justify-center gap-0.5 rounded-[8px] px-2 text-left text-sm font-semibold leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:flex-row sm:items-center sm:gap-2 sm:px-3",
      active === styleId
        ? isDark
          ? "bg-cyan-300 text-slate-950 focus-visible:outline-cyan-200"
          : tone === "utility"
            ? "bg-blue-700 text-white focus-visible:outline-blue-500"
            : "bg-slate-950 text-white focus-visible:outline-slate-500"
        : isDark
          ? "border border-white/15 bg-white/5 text-white/78 hover:bg-white/10 focus-visible:outline-cyan-200"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-500",
    );

  return (
    <nav
      className={clsx(
        "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
        isDark ? "text-white" : "text-slate-950",
      )}
      aria-label={copy.styleNav}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("/");
          }}
          className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-[8px] text-lg font-bold tracking-[0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <Utensils size={22} aria-hidden="true" />
          {copy.appName}
        </a>
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("/");
          }}
          className={clsx(
            "inline-flex min-h-9 w-fit items-center rounded-[8px] px-3 text-xs font-bold uppercase tracking-[0.12em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            isDark
              ? "border border-white/15 text-white/70 focus-visible:outline-cyan-200"
              : "border border-slate-200 bg-white text-slate-600 focus-visible:outline-slate-500",
          )}
        >
          {copy.comparisonCta}
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:max-w-full sm:overflow-x-auto sm:pb-1 md:pb-0">
          {styleIds.map((styleId) => {
            const href = selectedId
              ? `/style/${styleId}/market/${selectedId}`
              : styleRoutes[styleId];
            const styleCopyItem = getStyleCopy(styleId, locale);
            return (
              <a
                key={styleId}
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  navigateTo(href);
                }}
              className={itemClass(styleId)}
            >
              <span className="text-xs opacity-70">{styleCopyItem.version}</span>
              <span className="sm:hidden">{styleCopyItem.shortName}</span>
              <span className="hidden sm:inline">{styleCopyItem.name}</span>
            </a>
            );
          })}
        </div>
        <LanguageToggle locale={locale} setLocale={setLocale} tone={tone} />
      </div>
    </nav>
  );
}

function LanguageToggle({
  locale,
  setLocale,
  tone,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  tone: "dark" | "light" | "utility";
}) {
  const copy = uiCopy[locale];
  const isDark = tone === "dark";
  const buttonClass = (value: Locale) =>
    clsx(
      "min-h-9 rounded-[8px] px-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
      locale === value
        ? isDark
          ? "bg-white text-slate-950 focus-visible:outline-cyan-200"
          : tone === "utility"
            ? "bg-blue-700 text-white focus-visible:outline-blue-500"
            : "bg-slate-950 text-white focus-visible:outline-slate-500"
        : isDark
          ? "text-white/70 hover:bg-white/10 focus-visible:outline-cyan-200"
          : "text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-500",
    );

  return (
    <div
      className={clsx(
        "inline-flex w-fit items-center gap-1 rounded-[8px] border p-1",
        isDark ? "border-white/15 bg-white/5" : "border-slate-200 bg-white",
      )}
      aria-label={copy.languageLabel}
    >
      <button type="button" className={buttonClass("zh")} onClick={() => setLocale("zh")}>
        {uiCopy.zh.chinese}
      </button>
      <button type="button" className={buttonClass("en")} onClick={() => setLocale("en")}>
        {uiCopy.en.english}
      </button>
    </div>
  );
}

function FilterBar({
  filters,
  setFilters,
  options,
  clearFilters,
  tone,
  locale,
  compact = false,
}: {
  filters: NightMarketFilters;
  setFilters: (filters: NightMarketFilters) => void;
  options: ReturnType<typeof getFilterOptions>;
  clearFilters: () => void;
  tone: "neon" | "travel" | "utility";
  locale: Locale;
  compact?: boolean;
}) {
  const isNeon = tone === "neon";
  const copy = uiCopy[locale];
  const base = isNeon
    ? "border-white/15 bg-black/45 text-white shadow-glow"
    : tone === "utility"
      ? "border-slate-300 bg-white text-slate-950 shadow-sm"
      : "border-slate-200 bg-white text-slate-950 shadow-ambient";
  const control =
    "min-h-11 w-full rounded-[8px] border px-3 text-sm font-semibold outline-none transition focus:ring-2";
  const controlTone = isNeon
    ? "border-white/15 bg-white/10 text-white placeholder:text-white/45 focus:border-cyan-300 focus:ring-cyan-300/25"
    : "border-slate-200 bg-white text-slate-900 focus:border-slate-400 focus:ring-slate-300/40";

  const update = (patch: NightMarketFilters) => setFilters({ ...filters, ...patch });

  return (
    <section
      className={clsx(
        "rounded-[8px] border p-3 backdrop-blur-xl",
        base,
        compact ? "grid grid-cols-2 gap-2" : "mt-3 grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(130px,0.75fr))_auto]",
      )}
      aria-label={copy.searchLabel}
    >
      <label className={clsx("relative block", compact && "col-span-full")}>
        <span className="sr-only">{copy.searchLabel}</span>
        <Search
          className={clsx(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2",
            isNeon ? "text-cyan-100" : "text-slate-400",
          )}
          size={18}
          aria-hidden="true"
        />
        <input
          value={filters.query ?? ""}
          onChange={(event) => update({ query: event.target.value })}
          placeholder={copy.searchPlaceholder}
          className={clsx(control, controlTone, "pl-10")}
        />
      </label>
      <SelectControl
        label={copy.cityCounty}
        icon={<MapPin size={17} aria-hidden="true" />}
        value={filters.city ?? ""}
        onChange={(value) => update({ city: value })}
        options={options.cities}
        placeholder={copy.allCities}
        getOptionLabel={(value) => labelCity(value, locale)}
        className={clsx(control, controlTone)}
      />
      <SelectControl
        label={copy.mood}
        icon={<Sparkles size={17} aria-hidden="true" />}
        value={filters.mood ?? ""}
        onChange={(value) => update({ mood: value })}
        options={options.moods}
        placeholder={copy.anyMood}
        getOptionLabel={(value) => labelTag(value, locale)}
        className={clsx(control, controlTone)}
      />
      <SelectControl
        label={copy.foodType}
        icon={<Utensils size={17} aria-hidden="true" />}
        value={filters.foodType ?? ""}
        onChange={(value) => update({ foodType: value })}
        options={options.foodTypes}
        placeholder={copy.anyFood}
        getOptionLabel={(value) => labelTag(value, locale)}
        className={clsx(control, controlTone)}
      />
      <SelectControl
        label={copy.transportation}
        icon={<Train size={17} aria-hidden="true" />}
        value={filters.transport ?? ""}
        onChange={(value) => update({ transport: value })}
        options={options.transport}
        placeholder={copy.anyTransit}
        getOptionLabel={(value) => labelTransport(value, locale)}
        className={clsx(control, controlTone)}
      />
      <button
        type="button"
        onClick={clearFilters}
        className={clsx(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          compact && "w-full",
          isNeon
            ? "border border-white/15 bg-white/10 text-white hover:bg-white/15 focus-visible:outline-cyan-300"
            : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white focus-visible:outline-slate-500",
        )}
      >
        <X size={16} aria-hidden="true" />
        {copy.clear}
      </button>
      <div className={clsx("flex overflow-x-auto", compact ? "col-span-full gap-1.5" : "gap-2 lg:col-span-full")}>
        {options.openingDays.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => update({ openingDay: filters.openingDay === day ? undefined : day })}
            className={clsx(
              "min-h-10 rounded-[8px] border font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              compact ? "min-w-9 px-1.5 text-xs" : "min-w-14 px-3 text-sm",
              filters.openingDay === day
                ? isNeon
                  ? "border-amber-200 bg-amber-200 text-slate-950 shadow-glow focus-visible:outline-amber-100"
                  : tone === "utility"
                    ? "border-blue-700 bg-blue-700 text-white focus-visible:outline-blue-500"
                    : "border-emerald-700 bg-emerald-700 text-white focus-visible:outline-emerald-500"
                : isNeon
                  ? "border-white/15 bg-white/5 text-white/75 hover:text-white focus-visible:outline-cyan-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 focus-visible:outline-slate-500",
            )}
          >
            {labelDay(day, locale)}
          </button>
        ))}
      </div>
    </section>
  );
}

function SelectControl({
  label,
  icon,
  value,
  onChange,
  options,
  placeholder,
  getOptionLabel,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  getOptionLabel: (value: string) => string;
  className: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-current opacity-55">
        {icon}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(className, "appearance-none pl-10 pr-8")}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {getOptionLabel(option)}
          </option>
        ))}
      </select>
      <ChevronRight
        className="pointer-events-none absolute right-3 top-1/2 rotate-90 -translate-y-1/2 opacity-50"
        size={16}
        aria-hidden="true"
      />
    </label>
  );
}

function MarketCard({
  market,
  index,
  styleId,
  locale,
  active,
  onOpen,
}: {
  market: NightMarket;
  index: number;
  styleId: StyleId;
  locale: Locale;
  active: boolean;
  onOpen: (style: StyleId, id: string) => void;
}) {
  const isNeon = styleId === "neon";
  const isTravel = styleId === "travel";
  const copy = uiCopy[locale];
  const title = formatMarketTitle(market, locale);

  return (
    <article
      className={clsx(
        "group relative self-start overflow-hidden rounded-[8px] border transition",
        isNeon
          ? "border-white/12 bg-white/[0.07] text-white shadow-glow hover:border-cyan-300/45"
          : isTravel
            ? "border-slate-200 bg-white text-slate-950 shadow-sm hover:-translate-y-0.5 hover:shadow-ambient"
            : "border-slate-300 bg-white text-slate-950 shadow-sm hover:border-blue-400",
        active &&
          (isNeon
            ? "border-cyan-300/65"
            : isTravel
              ? "ring-2 ring-emerald-500/25"
              : "ring-2 ring-blue-500/25"),
      )}
    >
      <div className={clsx("absolute inset-x-0 top-0 h-1", cardAccent(index, styleId))} />
      <div className="flex flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className={clsx(
                "text-xs font-bold uppercase tracking-[0.12em]",
                isNeon ? "text-cyan-100/80" : isTravel ? "text-emerald-700" : "text-blue-700",
              )}
            >
              {title.location}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[0]">{title.primary}</h2>
            <p className={clsx("mt-1 text-base", isNeon ? "text-white/65" : "text-slate-500")}>
              {title.secondary}
            </p>
          </div>
          <span
            className={clsx(
              "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
              sourceTone(market.source.confidence, styleId),
            )}
          >
            {labelConfidence(market.source.confidence, locale)}
          </span>
        </div>

        <div className={clsx("mt-4 grid grid-cols-2 gap-3 text-sm", isNeon ? "text-white/72" : "text-slate-600")}>
          <InfoPill icon={<Clock3 size={16} aria-hidden="true" />} label={market.hours} />
          <InfoPill
            icon={<Train size={16} aria-hidden="true" />}
            label={`${market.walkingMinutes} ${copy.minWalk}`}
          />
        </div>

        <TagRow tags={[...market.foodTypes.slice(0, 2), ...market.moods.slice(0, 1)]} tone={styleId} locale={locale} />

        <p className={clsx("mt-4 line-clamp-3 text-sm leading-6", isNeon ? "text-white/68" : "text-slate-600")}>
          {market.highlights.map((item) => localize(item, locale)).join(" / ")}
        </p>

        <button
          type="button"
          onClick={() => onOpen(styleId, market.id)}
          aria-pressed={active}
          className={clsx(
            "mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            active
              ? isNeon
                ? "bg-white text-slate-950 shadow-glow focus-visible:outline-cyan-200"
                : isTravel
                  ? "bg-emerald-700 text-white focus-visible:outline-emerald-500"
                  : "bg-blue-900 text-white focus-visible:outline-blue-500"
              : isNeon
                ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200 focus-visible:outline-cyan-200"
                : isTravel
                  ? "bg-slate-950 text-white hover:bg-slate-800 focus-visible:outline-slate-500"
                  : "bg-blue-700 text-white hover:bg-blue-800 focus-visible:outline-blue-500",
          )}
        >
          {active ? copy.viewingDetails : copy.viewDetails}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function DetailPanel({
  market,
  styleId,
  locale,
  pulseKey = 0,
}: {
  market: NightMarket;
  styleId: StyleId;
  locale: Locale;
  pulseKey?: number;
}) {
  const isNeon = styleId === "neon";
  const isTravel = styleId === "travel";
  const copy = uiCopy[locale];
  const title = formatMarketTitle(market, locale);
  const insight = getMarketInsight(market, locale);
  const panelRef = useRef<HTMLElement>(null);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (pulseKey === 0) {
      return;
    }

    const block = window.matchMedia("(min-width: 1024px)").matches ? "nearest" : "start";
    setIsPulsing(true);
    panelRef.current?.scrollIntoView({ behavior: "smooth", block });

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus({ preventScroll: true });
    }, 220);
    const pulseTimer = window.setTimeout(() => setIsPulsing(false), 950);

    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(pulseTimer);
    };
  }, [market.id, pulseKey]);

  return (
    <article
      id="market-detail"
      ref={panelRef}
      tabIndex={-1}
      className={clsx(
        "scroll-mt-4 rounded-[8px] border p-5 transition duration-300 focus:outline-none",
        isNeon
          ? "border-white/15 bg-black/55 text-white shadow-glow backdrop-blur-xl"
          : isTravel
            ? "border-slate-200 bg-white text-slate-950 shadow-ambient"
            : "border-slate-300 bg-white text-slate-950 shadow-sm",
        isPulsing &&
          (isNeon
            ? "ring-2 ring-cyan-200/85 shadow-[0_0_42px_rgba(103,232,249,0.35)]"
            : isTravel
              ? "ring-2 ring-emerald-500/35"
              : "ring-2 ring-blue-500/35"),
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={clsx(
              "text-xs font-bold uppercase tracking-[0.12em]",
              isNeon ? "text-fuchsia-100" : isTravel ? "text-emerald-700" : "text-blue-700",
            )}
          >
            {copy.detailView}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[0]">{title.primary}</h2>
          <p className={clsx("mt-1 text-lg", isNeon ? "text-white/65" : "text-slate-500")}>
            {title.secondary}
          </p>
        </div>
        <MapPin
          className={clsx(isNeon ? "text-cyan-200" : isTravel ? "text-emerald-700" : "text-blue-700")}
          size={28}
          aria-hidden="true"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <DetailFact icon={<CalendarDays size={17} aria-hidden="true" />} label={copy.open} value={market.openingDays.map((day) => labelDay(day, locale)).join(" ")} styleId={styleId} />
        <DetailFact icon={<Clock3 size={17} aria-hidden="true" />} label={copy.hours} value={market.hours} styleId={styleId} />
        <DetailFact icon={<Train size={17} aria-hidden="true" />} label={copy.station} value={localize(market.nearestStation, locale)} styleId={styleId} />
        <DetailFact icon={<Navigation size={17} aria-hidden="true" />} label={copy.walk} value={`${market.walkingMinutes} ${copy.minWalk}`} styleId={styleId} />
      </div>

      <section className={clsx("mt-6 rounded-[8px] border p-4", isNeon ? "border-cyan-300/20 bg-cyan-300/8" : "border-emerald-700/15 bg-emerald-50/70")}>
        <div className="flex items-start gap-3">
          <span className={clsx("mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", isNeon ? "bg-cyan-300 text-slate-950" : "bg-emerald-700 text-white")}>
            <Sparkles size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] opacity-75">
              {insight.planLabel}
            </h3>
            <p className={clsx("mt-2 text-sm leading-6", isNeon ? "text-white/78" : "text-slate-700")}>
              {insight.plan}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <InsightTile title={insight.foodMissionTitle} body={insight.foodMission} styleId={styleId} />
          <InsightTile title={insight.timingTitle} body={insight.timing} styleId={styleId} />
          <InsightTile title={insight.bestForTitle} body={insight.bestFor} styleId={styleId} />
          <InsightTile title={insight.localTipTitle} body={insight.localTip} styleId={styleId} />
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] opacity-75">{copy.recommendedFoods}</h3>
        <div className="mt-3 grid gap-2">
          {market.recommendedFoods.map((food) => (
            <div key={food.en} className={clsx("flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold", isNeon ? "bg-white/8 text-white/82" : "bg-slate-50 text-slate-700")}>
              <Utensils size={16} aria-hidden="true" />
              {localize(food, locale)}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] opacity-75">{copy.practicalInfo}</h3>
        <ul className="mt-3 space-y-2">
          {market.practicalInfo.map((item) => (
            <li key={item.en} className={clsx("flex gap-2 text-sm leading-6", isNeon ? "text-white/72" : "text-slate-600")}>
              <CheckCircle2 className={clsx("mt-1 shrink-0", isNeon ? "text-cyan-200" : "text-emerald-700")} size={16} aria-hidden="true" />
              <span>{localize(item, locale)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className={clsx("mt-6 rounded-[8px] border p-3 text-sm", isNeon ? "border-white/12 bg-white/7 text-white/68" : "border-slate-200 bg-slate-50 text-slate-600")}>
        <div className="flex items-start gap-2">
          <BadgeInfo size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{localize(market.source.label, locale)}</p>
            <a
              href={market.source.url}
              target="_blank"
              rel="noreferrer"
              className={clsx("mt-1 inline-flex items-center gap-1 underline underline-offset-4", isNeon ? "text-cyan-100" : "text-blue-700")}
            >
              {copy.sourceReference}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function InsightTile({
  title,
  body,
  styleId,
}: {
  title: string;
  body: string;
  styleId: StyleId;
}) {
  const isNeon = styleId === "neon";

  return (
    <div
      className={clsx(
        "rounded-[8px] border px-3 py-2",
        isNeon ? "border-white/10 bg-black/25" : "border-slate-200 bg-white",
      )}
    >
      <p className={clsx("text-xs font-bold uppercase tracking-[0.12em]", isNeon ? "text-cyan-100/80" : "text-emerald-800")}>
        {title}
      </p>
      <p className={clsx("mt-1 text-sm leading-6", isNeon ? "text-white/70" : "text-slate-600")}>
        {body}
      </p>
    </div>
  );
}

function TaiwanMap({
  markets,
  selectedMarket,
  onSelect,
  tone,
  locale,
  showLabels = false,
}: {
  markets: NightMarket[];
  selectedMarket: NightMarket;
  onSelect: (market: NightMarket) => void;
  tone: "neon" | "travel" | "utility";
  locale: Locale;
  showLabels?: boolean;
}) {
  const copy = uiCopy[locale];
  const latMin = 21.85;
  const latMax = 25.45;
  const lngMin = 119.85;
  const lngMax = 122.05;
  const markerClass = (active: boolean) =>
    clsx(
      "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-bold shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
      active ? "h-9 w-9 z-20" : "h-6 w-6 z-10 hover:scale-110",
      tone === "neon"
        ? active
          ? "border-cyan-100 bg-cyan-300 text-slate-950 focus-visible:outline-cyan-200"
          : "border-fuchsia-100/70 bg-fuchsia-400 text-white focus-visible:outline-cyan-200"
        : tone === "travel"
          ? active
            ? "border-white bg-emerald-700 text-white focus-visible:outline-emerald-500"
            : "border-white bg-amber-500 text-slate-950 focus-visible:outline-emerald-500"
          : active
            ? "border-white bg-blue-700 text-white focus-visible:outline-blue-500"
            : "border-white bg-emerald-600 text-white focus-visible:outline-blue-500",
    );

  return (
    <div
      className={clsx(
        "relative h-full min-h-[18rem] w-full overflow-hidden",
        tone === "neon"
          ? "bg-[#070912]"
          : tone === "travel"
            ? "bg-[#f4f6f1]"
            : "bg-[#dfe8ef]",
      )}
      aria-label={copy.mapAria}
    >
      <div
        className={clsx(
          "absolute inset-4 rounded-[42%_52%_48%_43%/55%_44%_60%_45%] border",
          tone === "neon"
            ? "border-cyan-300/30 bg-cyan-300/10 shadow-glow"
            : tone === "travel"
              ? "border-emerald-700/20 bg-emerald-100/60"
              : "border-blue-700/20 bg-white/75",
        )}
      />
      <div className="absolute inset-0 bg-map-grid opacity-45" />
      {markets.map((market, index) => {
        const x = ((market.coordinates.lng - lngMin) / (lngMax - lngMin)) * 100;
        const y = 100 - ((market.coordinates.lat - latMin) / (latMax - latMin)) * 100;
        const active = market.id === selectedMarket.id;
        return (
          <button
            key={market.id}
            type="button"
            className={markerClass(active)}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onSelect(market)}
            aria-label={`${copy.viewDetails}: ${formatMarketTitle(market, locale).primary}`}
            title={formatMarketTitle(market, locale).primary}
          >
            {active ? <MapPin size={17} aria-hidden="true" /> : index + 1}
            {showLabels && active ? (
              <span className="absolute left-10 top-1/2 hidden min-w-40 -translate-y-1/2 rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-950 shadow-ambient sm:block">
                {formatMarketTitle(market, locale).primary}
              </span>
            ) : null}
          </button>
        );
      })}
      <div
        className={clsx(
          "absolute bottom-3 left-3 rounded-[8px] border px-3 py-2 text-xs font-semibold",
          tone === "neon"
            ? "border-white/12 bg-black/55 text-white/70"
            : "border-slate-200 bg-white/90 text-slate-600",
        )}
      >
        {copy.schematicMap}
      </div>
    </div>
  );
}

function StateFrame({
  status,
  retry,
  empty,
  clearFilters,
  tone,
  locale,
  children,
}: {
  status: DataStatus;
  retry: () => void;
  empty: boolean;
  clearFilters: () => void;
  tone: "dark" | "light" | "utility";
  locale: Locale;
  children: React.ReactNode;
}) {
  if (status === "loading") {
    return <LoadingState tone={tone} />;
  }

  if (status === "error") {
    return <ErrorState retry={retry} tone={tone} locale={locale} />;
  }

  if (empty) {
    return <EmptyState clearFilters={clearFilters} tone={tone} locale={locale} />;
  }

  return <>{children}</>;
}

function LoadingState({ tone }: { tone: "dark" | "light" | "utility" }) {
  const dark = tone === "dark";
  return (
    <section className={clsx("mx-auto max-w-[1480px] px-4 py-10 sm:px-6 lg:px-8", dark ? "text-white" : "text-slate-950")}>
      <div className={clsx("grid gap-4 md:grid-cols-2 xl:grid-cols-4")}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className={clsx(
              "h-64 animate-pulse rounded-[8px] border",
              dark ? "border-white/10 bg-white/8" : "border-slate-200 bg-white",
            )}
          >
            <div className={clsx("m-4 h-4 w-24 rounded", dark ? "bg-white/15" : "bg-slate-200")} />
            <div className={clsx("mx-4 mt-8 h-8 w-48 rounded", dark ? "bg-white/15" : "bg-slate-200")} />
            <div className={clsx("mx-4 mt-4 h-4 w-32 rounded", dark ? "bg-white/10" : "bg-slate-100")} />
            <div className={clsx("mx-4 mt-12 h-11 rounded-[8px]", dark ? "bg-cyan-300/20" : "bg-slate-100")} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ErrorState({ retry, tone, locale }: { retry: () => void; tone: "dark" | "light" | "utility"; locale: Locale }) {
  const dark = tone === "dark";
  const copy = uiCopy[locale];
  return (
    <section className={clsx("mx-auto max-w-3xl px-4 py-16 text-center sm:px-6", dark ? "text-white" : "text-slate-950")}>
      <div className={clsx("rounded-[8px] border p-8", dark ? "border-red-300/30 bg-red-400/10" : "border-red-200 bg-white")}>
        <AlertTriangle className={clsx("mx-auto", dark ? "text-red-200" : "text-red-600")} size={42} aria-hidden="true" />
        <h2 className="mt-4 text-3xl font-semibold tracking-[0]">{copy.dataErrorTitle}</h2>
        <p className={clsx("mx-auto mt-3 max-w-xl leading-7", dark ? "text-white/68" : "text-slate-600")}>
          {copy.dataErrorBody}
        </p>
        <button
          type="button"
          onClick={retry}
          className={clsx(
            "mt-6 inline-flex min-h-11 items-center gap-2 rounded-[8px] px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            dark ? "bg-red-200 text-slate-950 focus-visible:outline-red-100" : "bg-slate-950 text-white focus-visible:outline-slate-500",
          )}
        >
          <RefreshCcw size={16} aria-hidden="true" />
          {copy.retryData}
        </button>
      </div>
    </section>
  );
}

function EmptyState({ clearFilters, tone, locale }: { clearFilters: () => void; tone: "dark" | "light" | "utility"; locale: Locale }) {
  const dark = tone === "dark";
  const copy = uiCopy[locale];
  return (
    <section className={clsx("mx-auto max-w-3xl px-4 py-16 text-center sm:px-6", dark ? "text-white" : "text-slate-950")}>
      <div className={clsx("rounded-[8px] border p-8", dark ? "border-white/12 bg-white/7" : "border-slate-200 bg-white")}>
        <Search className={clsx("mx-auto", dark ? "text-cyan-200" : "text-slate-500")} size={42} aria-hidden="true" />
        <h2 className="mt-4 text-3xl font-semibold tracking-[0]">{copy.emptyTitle}</h2>
        <p className={clsx("mx-auto mt-3 max-w-xl leading-7", dark ? "text-white/68" : "text-slate-600")}>
          {copy.emptyBody}
        </p>
        <button
          type="button"
          onClick={clearFilters}
          className={clsx(
            "mt-6 inline-flex min-h-11 items-center gap-2 rounded-[8px] px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            dark ? "bg-cyan-300 text-slate-950 focus-visible:outline-cyan-200" : "bg-slate-950 text-white focus-visible:outline-slate-500",
          )}
        >
          <X size={16} aria-hidden="true" />
          {copy.clearAll}
        </button>
      </div>
    </section>
  );
}

function FallbackNotice({
  tone,
  locale,
  compact = false,
}: {
  tone: "dark" | "light" | "utility";
  locale: Locale;
  compact?: boolean;
}) {
  const dark = tone === "dark";
  const copy = uiCopy[locale];
  return (
    <aside
      className={clsx(
        "rounded-[8px] border",
        compact ? "p-3 text-sm" : "p-4",
        dark
          ? "border-amber-200/25 bg-amber-300/10 text-amber-50"
          : tone === "utility"
            ? "border-amber-300 bg-amber-50 text-amber-950"
            : "border-amber-200 bg-amber-50 text-amber-950",
      )}
    >
      <div className="flex items-start gap-3">
        <BadgeInfo size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">{compact ? copy.dataNoticeBodyCompact : copy.dataNoticeTitle}</p>
          {!compact ? (
            <p className={clsx("mt-1 leading-6", dark ? "text-amber-50/72" : "text-amber-900/75")}>
              {copy.dataNoticeBody}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function DetailFact({
  icon,
  label,
  value,
  styleId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  styleId: StyleId;
}) {
  const dark = styleId === "neon";
  return (
    <div className={clsx("rounded-[8px] border p-3", dark ? "border-white/12 bg-white/7" : "border-slate-200 bg-slate-50")}>
      <div className={clsx("flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]", dark ? "text-white/48" : "text-slate-500")}>
        {icon}
        {label}
      </div>
      <p className={clsx("mt-2 text-sm font-semibold leading-5", dark ? "text-white" : "text-slate-950")}>
        {value}
      </p>
    </div>
  );
}

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[8px] border border-current/10 bg-current/[0.04] px-3 py-2">
      <span className="shrink-0">{icon}</span>
      <span className="truncate font-semibold">{label}</span>
    </div>
  );
}

function TagRow({ tags, tone, locale }: { tags: string[]; tone: StyleId | "neon"; locale: Locale }) {
  const uniqueTags = Array.from(new Set(tags));

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {uniqueTags.map((tag) => (
        <span
          key={tag}
          className={clsx(
            "rounded-full px-2.5 py-1 text-xs font-bold",
            tone === "neon"
              ? "border border-cyan-300/25 bg-cyan-300/10 text-cyan-50"
              : tone === "travel"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-blue-50 text-blue-800",
          )}
        >
          {labelTag(tag, locale)}
        </span>
      ))}
    </div>
  );
}

function Metric({ value, label, tone = "light" }: { value: string; label: string; tone?: "light" | "dark" }) {
  return (
    <div className={clsx("min-w-0 p-2 text-center", tone === "dark" ? "text-white" : "text-slate-950")}>
      <p className="truncate text-2xl font-semibold tracking-[0]">{value}</p>
      <p className={clsx("mt-1 text-xs font-bold uppercase tracking-[0.12em]", tone === "dark" ? "text-white/52" : "text-slate-500")}>
        {label}
      </p>
    </div>
  );
}

function HeroImageOverlay() {
  return (
    <>
      <img
        src="/assets/night-market-hero.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-46"
      />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(5,7,18,0.96),rgba(8,9,20,0.84)_42%,rgba(23,10,36,0.70))]" />
      <div className="absolute inset-0 bg-neon-scan opacity-50" />
    </>
  );
}

function sourceTone(confidence: NightMarket["source"]["confidence"], styleId: StyleId) {
  if (styleId === "neon") {
    return confidence === "official"
      ? "bg-cyan-300/20 text-cyan-50"
      : confidence === "curated"
        ? "bg-fuchsia-300/20 text-fuchsia-50"
        : "bg-amber-300/20 text-amber-50";
  }

  return confidence === "official"
    ? "bg-emerald-100 text-emerald-800"
    : confidence === "curated"
      ? "bg-blue-100 text-blue-800"
      : "bg-amber-100 text-amber-800";
}

function cardAccent(index: number, styleId: StyleId) {
  const accents =
    styleId === "neon"
      ? ["bg-cyan-300", "bg-fuchsia-400", "bg-amber-300"]
      : styleId === "travel"
        ? ["bg-emerald-700", "bg-sky-600", "bg-rose-500"]
        : ["bg-blue-700", "bg-emerald-600", "bg-amber-500"];
  return accents[index % accents.length];
}
