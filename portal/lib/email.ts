import type { Role } from "./types";
// Safe for browser code (no Node imports).

/** Every person's work email lives on this domain. */
export const COMPANY_DOMAIN = "infinyty.tech";

/** The part of an email before the @ (lower case, trimmed). */
export const emailName = (s: string) => s.trim().toLowerCase().split("@")[0];

/** Shows any stored email on the company domain, e.g. "aditi@whatever.com" becomes "aditi@infinyty.tech". */
export const companyEmail = (s: string | null | undefined) => (s ? `${emailName(s)}@${COMPANY_DOMAIN}` : "");

/** Old addresses that still sign in until the database is migrated. */
export const LEGACY_DOMAINS = ["infinityanalyticsconsulting.com", "infinity.demo"];

export interface OrgNode {
  id: number;
  name: string;
  title: string | null;
  department: string | null;
  role: Role;
  avatar_url: string | null;
  reports: OrgNode[];
}
