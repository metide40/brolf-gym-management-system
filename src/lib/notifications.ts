import type { AppNotification, Role, Session } from "../types";

// Stored data from before per-person read state: one shared `read` flag instead of `readBy`.
export type StoredNotification = Omit<AppNotification, "readBy"> & { read?: boolean; readBy?: string[] };

// A person is identified by their sign-in email. (A real backend would use the user id.)
export const userKey = (session: Pick<Session, "email">): string => session.email.trim().toLowerCase();

const audienceRoles = (audience: AppNotification["audience"]): Role[] | "all" =>
  audience === "all" ? "all" : Array.isArray(audience) ? audience : [audience];

// Personal notifications (memberId / trainerId) go to that one person only.
// The rest go to everyone with a matching role, or to everyone when the audience is "all".
function isAddressedTo(n: AppNotification, session: Session): boolean {
  if (n.memberId) return session.role === "member" && session.memberId === n.memberId;
  if (n.trainerId) return session.role === "trainer" && session.trainerId === n.trainerId;
  const roles = audienceRoles(n.audience);
  return roles === "all" || roles.includes(session.role);
}

export const isClearedBy = (n: AppNotification, session: Session): boolean => (n.clearedBy ?? []).includes(userKey(session));

// What this person sees in their list: addressed to them, and not cleared by them.
export const isVisibleTo = (n: AppNotification, session: Session): boolean => isAddressedTo(n, session) && !isClearedBy(n, session);

export const visibleNotifications = (all: AppNotification[], session: Session): AppNotification[] => all.filter((n) => isVisibleTo(n, session));

export const isReadBy = (n: AppNotification, session: Session): boolean => n.readBy.includes(userKey(session));

export const unreadCount = (all: AppNotification[], session: Session): number =>
  visibleNotifications(all, session).filter((n) => !isReadBy(n, session)).length;

// Marks every notification this person can see as read, for this person only.
export function markAllReadFor(all: AppNotification[], session: Session): AppNotification[] {
  const key = userKey(session);
  return all.map((n) => (isVisibleTo(n, session) && !n.readBy.includes(key) ? { ...n, readBy: [...n.readBy, key] } : n));
}

// Removes everything this person can see from their own list. Other people still see their copies.
export function clearAllFor(all: AppNotification[], session: Session): AppNotification[] {
  const key = userKey(session);
  return all.map((n) => (isVisibleTo(n, session) ? { ...n, clearedBy: [...(n.clearedBy ?? []), key] } : n));
}

// Upgrades a notification saved before per-person read state. A notification that was
// already read stays read for the accounts that could see it.
export function normalizeNotification(raw: StoredNotification, accounts: { email: string; role: Role }[]): AppNotification {
  const { read, ...rest } = raw;
  if (Array.isArray(rest.readBy)) return { ...rest, readBy: rest.readBy };
  const readBy = read
    ? accounts
        .filter((a) => {
          const roles = audienceRoles(rest.audience);
          return roles === "all" || roles.includes(a.role);
        })
        .map((a) => a.email.toLowerCase())
    : [];
  return { ...rest, readBy };
}
