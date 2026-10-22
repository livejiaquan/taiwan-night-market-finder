import { Component, lazy, Suspense, useEffect, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { getAppLocation } from "./lib/basePath";
import { appUrl } from "./lib/basePath";

const TrustedApp = lazy(() => import("./product/TrustedApp"));
const LegacyPrototype = lazy(() => import("./App"));

function usePathname() {
  const [pathname, setPathname] = useState(() => getAppLocation().pathname);

  useEffect(() => {
    const updatePathname = () => setPathname(getAppLocation().pathname);
    window.addEventListener("popstate", updatePathname);
    return () => window.removeEventListener("popstate", updatePathname);
  }, []);

  return pathname;
}

function LoadingShell() {
  return (
    <main
      aria-busy="true"
      aria-label="正在載入已核對的夜市資料"
      className="product-shell min-h-screen"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-edge" />
        <div className="mt-10 max-w-2xl space-y-4">
          <div className="h-4 w-28 animate-pulse rounded-sm bg-lantern/30" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-edge" />
          <div className="h-6 w-4/5 animate-pulse rounded-lg bg-edge" />
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="h-52 animate-pulse rounded-2xl border border-edge bg-surface"
              key={index}
            />
          ))}
        </div>
        <span className="sr-only">資料載入中，完成後會顯示結果。</span>
      </div>
    </main>
  );
}

interface ProductErrorBoundaryProps {
  children: ReactNode;
}

interface ProductErrorBoundaryState {
  hasError: boolean;
}

class ProductErrorBoundary extends Component<
  ProductErrorBoundaryProps,
  ProductErrorBoundaryState
> {
  state: ProductErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ProductErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Night-market product failed to render", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="product-shell flex min-h-screen items-center px-4 py-16">
          <section
            aria-labelledby="fatal-error-title"
            className="mx-auto w-full max-w-xl rounded-2xl border border-bad/40 bg-surface p-6 shadow-ambient sm:p-8"
            role="alert"
          >
            <p className="text-sm font-bold text-bad">資料暫時不可用</p>
            <h1 className="mt-2 text-3xl font-semibold" id="fatal-error-title">
              我們無法安全顯示夜市候選
            </h1>
            <p className="mt-4 leading-7 text-muted">
              已核對資料沒有完整載入，所以這裡不會用舊範例填補。你可以重新載入，或直接查看臺南市政府的原始名冊。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="min-h-11 rounded-lg bg-lantern px-4 font-semibold text-lantern-fg transition hover:brightness-110 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-600"
                onClick={() => window.location.reload()}
                type="button"
              >
                重新載入
              </button>
              <a
                className="inline-flex min-h-11 items-center rounded-lg border border-edge px-4 font-semibold text-fg transition-colors hover:border-fg focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                href="https://data.gov.tw/dataset/53634"
                rel="noreferrer"
                target="_blank"
              >
                查看官方名冊
              </a>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default function ProductRouter() {
  const pathname = usePathname();
  const isLegacyRoute = pathname === "/lab" || pathname.startsWith("/style/");

  useEffect(() => {
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    robots?.setAttribute("content", isLegacyRoute ? "noindex,nofollow" : "index,follow");
    if (isLegacyRoute) {
      document.title = "視覺原型 Lab · 今晚哪裡有市";
      document
        .querySelector<HTMLLinkElement>('link[rel="canonical"]')
        ?.setAttribute("href", new URL(appUrl("/lab"), window.location.origin).toString());
    }
  }, [isLegacyRoute]);

  return (
    <ProductErrorBoundary key={isLegacyRoute ? "legacy" : "product"}>
      <Suspense fallback={<LoadingShell />}>
        {isLegacyRoute ? <LegacyPrototype /> : <TrustedApp />}
      </Suspense>
    </ProductErrorBoundary>
  );
}
