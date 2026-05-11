export const ROUTE_PATHS = {
  landing: "/",
  overview: "/overview",
  scans: "/scans",
  reports: "/reports",
  users: "/users",
  settings: "/settings",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  terms: "/terms",
  privacy: "/privacy",
}

const PATH_TO_ROUTE = {
  "/": "landing",
  "/overview": "overview",
  "/scans": "scans",
  "/reports": "reports",
  "/users": "users",
  "/settings": "settings",
  "/login": "login",
  "/signup": "signup",
  "/forgot-password": "forgotPassword",
  "/terms": "terms",
  "/privacy": "privacy",
}

export function getRouteFromPath(pathname) {
  if (typeof pathname !== "string") return "overview"

  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname

  return PATH_TO_ROUTE[normalizedPath] || "landing"
}

export function getPathForRoute(route) {
  return ROUTE_PATHS[route] || ROUTE_PATHS.landing
}
