export const ADMIN_SESSION_COOKIE = "gps_ams_admin_session";
export const OFFICER_SESSION_COOKIE = "gps_ams_officer_session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export function sessionMaxAge(stayLoggedIn) {
  return stayLoggedIn ? 60 * 60 * 24 * 30 : undefined;
}
