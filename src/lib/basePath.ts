const basePath = import.meta.env.BASE_URL.replace(/\/$/u, "");
type AppLocationInput = Pick<Location, "origin" | "pathname" | "search">;

export function getAppLocation(
  browserLocation: AppLocationInput = window.location,
  configuredBasePath = basePath,
) {
  const restoredPath = new URLSearchParams(browserLocation.search).get("p");

  if (restoredPath?.startsWith("/")) {
    const restored = new URL(restoredPath, browserLocation.origin);
    return { pathname: restored.pathname, search: restored.search };
  }

  const pathname =
    configuredBasePath && (browserLocation.pathname === configuredBasePath || browserLocation.pathname.startsWith(`${configuredBasePath}/`))
      ? browserLocation.pathname.slice(configuredBasePath.length) || "/"
      : browserLocation.pathname;
  return { pathname, search: browserLocation.search };
}

export function appUrl(pathname: string, params?: URLSearchParams) {
  const relativePath = pathname.replace(/^\//u, "");
  const prefix = `${import.meta.env.BASE_URL}${relativePath}`;
  const search = params?.toString();
  return search ? `${prefix}?${search}` : prefix;
}
