import { randomBytes } from "node:crypto";
import type { Role } from "./types";

/** Who may hand out which role. The Founder can create anyone; HR Admins can create everyone except Founders; Managers create employees on their own team. */
export const ASSIGNABLE: Record<Role, Role[]> = {
  founder: ["founder", "hr_admin", "manager", "employee"],
  hr_admin: ["hr_admin", "manager", "employee"],
  manager: ["employee"],
  employee: [],
};

/** Roles that can have people reporting to them. */
export const CAN_MANAGE: Role[] = ["founder", "hr_admin", "manager"];

export const tempPassword = () => `Hub-${randomBytes(9).toString("base64url")}`;

export const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
