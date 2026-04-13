import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeDisplayName(name: string | null | undefined): string | null {
  if (!name) return null;
  if (name.includes("@")) return null;

  const trimmed = name.trim();
  if (!trimmed) return null;
  if (!trimmed.includes(" ") && /^[a-z0-9]{8,}$/i.test(trimmed)) return null;

  return trimmed;
}

export function getDisplayIdentity(options: {
  displayName?: string | null;
  username?: string | null;
  fallback?: string;
}) {
  const safeName = sanitizeDisplayName(options.displayName);
  if (safeName) return safeName;

  const safeUsername = options.username?.trim().replace(/^@+/, "");
  if (safeUsername) return `@${safeUsername}`;

  return options.fallback ?? "Someone";
}
