const basePath = import.meta.env.BASE_URL.replace(/\/$/u, "");

export function getAppLocation() {
  const browserLocation = window.location;
  const restoredPath = new URLSearchParams(browserLocation.search).get("p");

  if (restoredPath?.startsWith("/")) {
    const restored = new URL(restoredPath, browserLocation.origin);
    return { pathname: restored.pathname, search: restored.search };
  }

  const pathname =
    basePath && (browserLocation.pathname === basePath || browserLocation.pathname.startsWith(`${basePath}/`))
      ? browserLocation.pathname.slice(basePath.length) || "/"
      : browserLocation.pathname;
  return { pathname, search: browserLocation.search };
}

export function appUrl(pathname: string, params?: URLSearchParams) {
  const relativePath = pathname.replace(/^\//u, "");
  const prefix = `${import.meta.env.BASE_URL}${relativePath}`;
  const search = params?.toString();
  return search ? `${prefix}?${search}` : prefix;
}
