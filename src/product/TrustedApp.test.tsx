import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TrustedApp from "./TrustedApp";
import { scheduleText } from "./scheduleText";

describe("trusted public experience", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T15:45:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders Chinese regular-schedule weekdays with an unambiguous week prefix", () => {
    expect(scheduleText(["Mon"], "zh")).toBe("週一");
    expect(scheduleText(["Wed", "Fri", "Sat"], "zh")).toBe("週三、週五、週六");
    expect(scheduleText(["Mon"], "en")).toBe("Mon");
  });

  it("defaults a Sunday decision to scheduled candidates instead of all markets", () => {
    window.history.replaceState({}, "", "/?date=2026-08-09");
    render(<TrustedApp />);

    expect(screen.getByText("7 個正常週期候選，0 個資料需再確認")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "花園夜市" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "武聖夜市" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "大東夜市" })).not.toBeInTheDocument();
  });

  it("shows Garden Night Market as a Friday conflict, not a confirmed result", () => {
    window.history.replaceState({}, "", "/?date=2026-08-14&q=花園");
    render(<TrustedApp />);

    expect(screen.getByText("0 個正常週期候選，1 個資料需再確認")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "花園夜市" })).toBeInTheDocument();
    expect(screen.getByText("資料來源對這一天有分歧")).toBeInTheDocument();
  });

  it("narrows Friday candidates by the exact official East District code", () => {
    window.history.replaceState({}, "", "/?date=2026-08-14&district=67000320");
    render(<TrustedApp />);

    expect(screen.getByRole("combobox", { name: "行政區（選填）" })).toHaveValue("67000320");
    expect(screen.getByText("2 個正常週期候選，0 個資料需再確認")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "大東夜市" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "大東東夜市" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "武聖夜市" })).not.toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "查看依據與導航" })) {
      expect(link).toHaveAttribute("href", expect.stringContaining("district=67000320"));
    }
  });

  it("keeps the North District Friday conflict out of confirmed results", () => {
    window.history.replaceState({}, "", "/?date=2026-08-14&district=67000340");
    render(<TrustedApp />);

    expect(screen.getByText("0 個正常週期候選，1 個資料需再確認")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "花園夜市" })).toBeInTheDocument();
    expect(screen.getByText("資料來源對這一天有分歧")).toBeInTheDocument();
  });

  it("uses official district names in search, even when the permitted area omits the name", () => {
    window.history.replaceState({}, "", "/?date=2026-08-14&q=東區");
    render(<TrustedApp />);

    expect(screen.getByText("2 個正常週期候選，0 個資料需再確認")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "大東夜市" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "大東東夜市" })).toBeInTheDocument();
  });

  it("recovers from an invalid district link without applying the wrong filter", () => {
    window.history.replaceState({}, "", "/?date=2026-08-14&district=67000999");
    render(<TrustedApp />);

    expect(screen.getByText("連結中的行政區條件無效，已改為顯示全部本名冊行政區。")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "行政區（選填）" })).toHaveValue("");
    expect(screen.getByText("8 個正常週期候選，1 個資料需再確認")).toBeInTheDocument();
    expect(window.location.search).not.toContain("district=");
  });

  it("offers a recovery action when an exact district has no same-day candidate", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    window.history.replaceState({}, "", "/?date=2026-08-14&district=67000350");
    render(<TrustedApp />);

    expect(screen.getByRole("heading", { name: "這個條件下沒有可安全顯示的當日候選" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "清除條件" }));
    expect(screen.getByText("8 個正常週期候選，1 個資料需再確認")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "行政區（選填）" })).toHaveValue("");
    scrollTo.mockRestore();
  });

  it("keeps field-wide Garden evidence consistent with a confirmed Sunday decision", () => {
    window.history.replaceState({}, "", "/market/tainan-licensed-22?date=2026-08-16");
    render(<TrustedApp />);

    expect(screen.getByText("正常週期有排班")).toBeInTheDocument();
    expect(screen.getAllByText("所選日期一致")).toHaveLength(2);
    expect(screen.queryByText("來源值有差異")).not.toBeInTheDocument();
  });

  it("labels Garden's two schedule values as different on the conflicted Friday", () => {
    window.history.replaceState({}, "", "/market/tainan-licensed-22?date=2026-08-14");
    render(<TrustedApp />);

    expect(screen.getByText("資料來源對這一天有分歧")).toBeInTheDocument();
    expect(screen.getAllByText("來源值有差異")).toHaveLength(2);
  });

  it("does not turn every market into a candidate when the dataset is hard stale", () => {
    vi.setSystemTime(new Date("2026-11-10T00:00:00Z"));
    window.history.replaceState({}, "", "/?date=2026-11-15");
    render(<TrustedApp />);

    expect(screen.getByText("0 個正常週期候選，7 個資料需再確認")).toBeInTheDocument();
    expect(screen.getByText(/部分週期依據已超過 90 天未重新比對/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "武聖夜市" })).not.toBeInTheDocument();
  });

  it("shows dataset staleness even when a day-specific conflict wins the decision status", () => {
    vi.setSystemTime(new Date("2026-11-10T00:00:00Z"));
    window.history.replaceState({}, "", "/?date=2026-11-13&q=花園");
    render(<TrustedApp />);

    expect(screen.getByText("0 個正常週期候選，1 個資料需再確認")).toBeInTheDocument();
    expect(screen.getByText("資料來源對這一天有分歧")).toBeInTheDocument();
    expect(screen.getByText(/部分週期依據已超過 90 天未重新比對/)).toBeInTheDocument();
  });

  it("does not show stale schedule evidence as green while retaining the separately fresh district reference", () => {
    vi.setSystemTime(new Date("2026-11-10T00:00:00Z"));
    window.history.replaceState({}, "", "/market/tainan-licensed-22?date=2026-11-15");
    render(<TrustedApp />);

    expect(screen.getAllByText("資料已超過比對期限")).toHaveLength(7);
    const districtEvidence = screen.getByRole("heading", { name: "行政區" }).closest("article");
    expect(districtEvidence).not.toBeNull();
    expect(districtEvidence).toHaveTextContent("資料已比對");
    expect(screen.getByText(/這個判斷的至少一項週期依據已超過 90 天未重新比對/)).toBeInTheDocument();
  });

  it("renders field evidence and a disclosed name-based Maps action", () => {
    window.history.replaceState(
      {},
      "",
      "/market/tainan-licensed-5?date=2026-08-14",
    );
    render(<TrustedApp />);

    expect(screen.getByRole("heading", { name: "武聖夜市" })).toBeInTheDocument();
    expect(screen.getByText("週三、週五、週六")).toBeInTheDocument();
    expect(screen.getByText("來源記載：週三、週五、週六")).toBeInTheDocument();
    expect(screen.getByText("以夜市名稱搜尋，不是官方座標")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "其他決策欄位來源" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "夜市名稱" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "許可路段或區域" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Maps 搜尋字串" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "行政區代碼" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "行政區" })).toBeInTheDocument();
    expect(screen.getByText("中西區")).toBeInTheDocument();
    expect(screen.getByText("來源記載：臺南市中西區")).toBeInTheDocument();
    expect(screen.getByText(/夜市名稱 \+ 官方許可路段或區域/)).toBeInTheDocument();
    const mapsLink = screen.getByRole("link", { name: /用 Google Maps 搜尋導航/ });
    expect(mapsLink).toHaveAttribute("href", expect.stringContaining("google.com/maps/search"));
    expect(screen.getAllByRole("link", { name: /開啟原始來源/ })[0]).toHaveAttribute(
      "href",
      "https://soa.tainan.gov.tw/Api/Service/Get/611e74b4-d09a-4712-b421-aa062fd02854",
    );
  });

  it("does not silently substitute a market for an invalid deep link", () => {
    window.history.replaceState({}, "", "/market/not-a-record?date=2026-08-14");
    render(<TrustedApp />);

    expect(screen.getByRole("heading", { name: "找不到這個夜市資料" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "太子廟夜市" })).not.toBeInTheDocument();
  });

  it.each([
    "/market?date=2026-08-14",
    "/market/tainan-licensed-5/extra?date=2026-08-14",
    "/market/%E0%A4%A?date=2026-08-14",
  ])("treats a malformed product path as not found: %s", (path) => {
    window.history.replaceState({}, "", path);
    render(<TrustedApp />);

    expect(screen.getByRole("heading", { name: "找不到這個夜市資料" })).toBeInTheDocument();
  });

  it("offers a recovery action when search removes every same-day candidate", () => {
    window.history.replaceState({}, "", "/?date=2026-08-09");
    render(<TrustedApp />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "不存在的夜市" } });
    expect(screen.getByRole("heading", { name: "這個條件下沒有可安全顯示的當日候選" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "清除搜尋" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "清除條件" })).toBeInTheDocument();
  });

  it("moves a client-side detail navigation back to the top", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    window.history.replaceState({}, "", "/?date=2026-08-14&q=武聖");
    render(<TrustedApp />);

    fireEvent.click(screen.getByRole("link", { name: "查看依據與導航" }));

    expect(window.location.pathname).toBe("/market/tainan-licensed-5");
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
    scrollTo.mockRestore();
  });
  it("shows an unknown actual-opening status and source dates on every regular candidate", () => {
    window.history.replaceState({}, "", "/?date=2026-08-14&q=武聖");
    render(<TrustedApp />);
    const card = screen.getByRole("heading", { name: "武聖夜市" }).closest("article")!;
    expect(within(card).getByText("正常週期有排班")).toBeInTheDocument();
    expect(within(card).getByText("所選日期現場營業")).toBeInTheDocument();
    expect(within(card).getByText("尚未確認")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "臺南市已取得設置許可夜市名冊" })).toHaveAttribute("href", expect.stringContaining("soa.tainan.gov.tw"));
    expect(card.querySelector("time")).toHaveAttribute("datetime", "2026-08-09T15:34:35.999Z");
    expect(card).not.toHaveTextContent("即時營業中");
  });

  it("keeps Friday conflict evidence in its own group with both claims visible", () => {
    window.history.replaceState({}, "", "/?date=2026-08-14&district=67000340");
    render(<TrustedApp />);
    expect(screen.queryByRole("region", { name: "正常週期候選" })).not.toBeInTheDocument();
    const group = screen.getByRole("region", { name: "需再確認" });
    expect(within(group).getByText("週五：此星期有排班")).toBeInTheDocument();
    expect(within(group).getByText("週五：此星期未排班")).toBeInTheDocument();
    expect(within(group).getByRole("link", { name: "臺南旅遊網：花園夜市" })).toHaveAttribute("href", "https://www.twtainan.net/zh-tw/attractions/detail/5572/");
    expect(within(group).getByText("尚未確認")).toBeInTheDocument();
  });

  it("shows aging evidence without claiming a fresh field or actual opening", () => {
    vi.setSystemTime(new Date("2026-09-30T00:00:00Z"));
    window.history.replaceState({}, "", "/?date=2026-10-02&q=武聖");
    render(<TrustedApp />);
    expect(screen.getByText("距比對 51 天 · 超過 30 天未重新比對")).toBeInTheDocument();
    expect(screen.getByText("尚未確認")).toBeInTheDocument();
  });

  it("supports arbitrary dates and return-to-today without clearing the district or query", () => {
    window.history.replaceState({}, "", "/?date=2026-08-14&q=花園&district=67000340");
    render(<TrustedApp />);
    fireEvent.change(screen.getByLabelText("指定日期"), { target: { value: "2026-09-04" } });
    expect(window.location.search).toContain("date=2026-09-04");
    expect(screen.getByText("0 個正常週期候選，1 個資料需再確認")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "回到今天" }));
    expect(screen.getByLabelText("指定日期")).toHaveValue("2026-08-09");
    expect(screen.getByRole("combobox")).toHaveValue("67000340");
    expect(screen.getByRole("searchbox")).toHaveValue("花園");
  });

  it("recovers visibly from invalid linked dates", () => {
    window.history.replaceState({}, "", "/?date=2026-02-30");
    render(<TrustedApp />);
    expect(screen.getByText("連結中的日期無效，已改為臺灣時間的今天。")).toBeInTheDocument();
    expect(screen.getByLabelText("指定日期")).toHaveValue("2026-08-09");
  });

  it("rolls an implicit today across Taipei midnight and explains the clock-hour limitation", () => {
    vi.setSystemTime(new Date("2026-08-09T15:59:30Z"));
    window.history.replaceState({}, "", "/");
    render(<TrustedApp />);
    expect(screen.getByLabelText("指定日期")).toHaveValue("2026-08-09");
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByLabelText("指定日期")).toHaveValue("2026-08-10");
    expect(screen.getByText(/不判斷跨午夜是否仍營業/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "花園夜市" })).not.toBeInTheDocument();
  });

  it("preserves a shared explicit date across midnight and browser history navigation", () => {
    vi.setSystemTime(new Date("2026-08-09T15:59:30Z"));
    window.history.replaceState({}, "", "/?date=2026-08-09");
    render(<TrustedApp />);
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByLabelText("指定日期")).toHaveValue("2026-08-09");
    act(() => {
      window.history.replaceState({}, "", "/?date=2026-08-14&district=67000340");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByLabelText("指定日期")).toHaveValue("2026-08-14");
    expect(screen.getByText("0 個正常週期候選，1 個資料需再確認")).toBeInTheDocument();
  });

  it("refreshes freshness on tab return without moving keyboard focus", () => {
    window.history.replaceState({}, "", "/market/tainan-licensed-5?date=2026-08-14");
    render(<TrustedApp />);
    const share = screen.getByRole("button", { name: "分享這個日期與夜市" });
    share.focus();
    vi.setSystemTime(new Date("2026-11-10T00:00:00Z"));
    fireEvent.focus(window);
    expect(screen.getAllByText("資料已超過比對期限").length).toBeGreaterThan(0);
    expect(share).toHaveFocus();
  });

  it("warns about actual opening before the Maps action and keeps the status explicit in English", () => {
    window.history.replaceState({}, "", "/market/tainan-licensed-5?date=2026-08-14");
    render(<TrustedApp />);
    const warning = screen.getByRole("heading", { name: "出發前先確認" });
    const map = screen.getByRole("link", { name: /用 Google Maps 搜尋導航/ });
    expect(warning.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(screen.getByText("Actual opening on this date")).toBeInTheDocument();
    expect(screen.getByText("Not confirmed")).toBeInTheDocument();
    expect(screen.getByText("Scheduled on its regular cycle")).toBeInTheDocument();
  });

  it("returns to a live today while preserving filters and keyboard focus across refresh", () => {
    vi.setSystemTime(new Date("2026-08-09T15:59:30Z"));
    window.history.replaceState({}, "", "/?date=2026-08-14&q=夜市&district=67000340");
    render(<TrustedApp />);
    fireEvent.click(screen.getByRole("button", { name: "回到今天" }));
    expect(window.location.search).not.toContain("date=");
    const search = screen.getByRole("searchbox");
    search.focus();
    act(() => vi.advanceTimersByTime(60_000));
    expect(search).toHaveFocus();
    expect(search).toHaveValue("夜市");
    expect(screen.getByRole("combobox")).toHaveValue("67000340");
    expect(screen.getByLabelText("指定日期")).toHaveValue("2026-08-10");
  });

  it("keeps a newly edited search and an explicit date during a timer refresh", () => {
    window.history.replaceState({}, "", "/?date=2026-08-14");
    render(<TrustedApp />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "花園" } });
    search.focus();
    act(() => vi.advanceTimersByTime(60_000));
    expect(search).toHaveFocus();
    expect(search).toHaveValue("花園");
    expect(screen.getByLabelText("指定日期")).toHaveValue("2026-08-14");
    expect(screen.getByText("0 個正常週期候選，1 個資料需再確認")).toBeInTheDocument();
  });

});
