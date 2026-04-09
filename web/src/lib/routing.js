export const ROUTE_PATHS = {
  overview: "/",
  scans: "/scans",
  reports: "/reports",
  users: "/users",
  settings: "/settings",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
}

const PATH_TO_ROUTE = {
  "/": "overview",
  "/overview": "overview",
  "/scans": "scans",
  "/reports": "reports",
  "/users": "users",
  "/settings": "settings",
  "/login": "login",
  "/signup": "signup",
  "/forgot-password": "forgotPassword",
}

export function getRouteFromPath(pathname) {
  if (typeof pathname !== "string") return "overview"

  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname

  return PATH_TO_ROUTE[normalizedPath] || "overview"
}

export function getPathForRoute(route) {
  return ROUTE_PATHS[route] || ROUTE_PATHS.overview
}
