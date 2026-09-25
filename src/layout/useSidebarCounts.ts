import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_ORIGIN } from "../apiConfig";

/**
 * Shared, always-in-sync sidebar counter hook.
 *
 * Re-fetches when:
 *  - the component mounts
 *  - the user navigates to a different route (most counts change after an action)
 *  - the window regains focus / the tab becomes visible again
 *  - every `pollMs` (default 30s) as a fallback
 *  - anything dispatches `window.dispatchEvent(new Event("sidebar:refresh"))`
 *    (e.g. after accepting/rejecting a manuscript, submitting a review, etc.)
 */

export const SIDEBAR_REFRESH_EVENT = "sidebar:refresh";

/** Call this after any action that should update sidebar counters immediately. */
export const refreshSidebarCounts = () => {
  window.dispatchEvent(new Event(SIDEBAR_REFRESH_EVENT));
};

type Role = "editor" | "eic" | "reviewer" | "author";

const ENDPOINTS: Record<Role, { url: string; action: string }> = {
  editor: {
    url: `${API_ORIGIN}/api2/editorApi.php`,
    action: "getSidebarCounts",
  },
  eic: {
    url: `${API_ORIGIN}/api2/EICcountersAPI.php`,
    action: "dashboardCounts",
  },
  reviewer: {
    url: `${API_ORIGIN}/api2/reviewerApi.php`,
    action: "getDashboardStats",
  },
  author: {
    url: `${API_ORIGIN}/api2/authorApi.php`,
    action: "getSidebarCounts",
  },
};

/**
 * EIC manuscript category counts — computed from the EXACT same endpoint and
 * status filter the ManuscriptCategoryView page uses, so sidebar badges can
 * never drift out of sync with what a category page actually shows.
 */
const EIC_LIST_API = `${API_ORIGIN}/api2/EICmanusciptsapi.php`;

const EIC_CATEGORY_STATUSES = [
  "New Submissions",
  "Under Review",
  "Revisions",
  "Revised",
  "Accepted",
  "Rejected",
  "Published",
] as const;

export type EicCategoryCounts = Record<string, number>;

// Module-level cache + in-flight guard so the sidebar and any other consumer
// share one batch of requests and don't hammer the API.
let eicCategoryCache: { counts: EicCategoryCounts; ts: number } | null = null;
let eicCategoryInFlight: Promise<EicCategoryCounts> | null = null;
const EIC_CATEGORY_TTL = 30000;

const fetchEicCategoryCounts = async (force = false): Promise<EicCategoryCounts> => {
  const now = Date.now();
  if (!force && eicCategoryCache && now - eicCategoryCache.ts < EIC_CATEGORY_TTL) {
    return eicCategoryCache.counts;
  }
  if (eicCategoryInFlight) return eicCategoryInFlight;

  eicCategoryInFlight = (async () => {
    const entries = await Promise.all(
      EIC_CATEGORY_STATUSES.map(async (status) => {
        try {
          const res = await fetch(
            `${EIC_LIST_API}?action=list&status=${encodeURIComponent(status)}`,
          );
          if (!res.ok) return [status, 0] as const;
          const data = await res.json();
          // The list endpoint paginates — use the reported total, not the page length.
          const total =
            data?.pagination?.total ?? (data?.data || []).length;
          return [status, Number(total) || 0] as const;
        } catch {
          return [status, 0] as const;
        }
      }),
    );
    const counts: EicCategoryCounts = Object.fromEntries(entries);
    eicCategoryCache = { counts, ts: Date.now() };
    return counts;
  })();

  try {
    return await eicCategoryInFlight;
  } finally {
    eicCategoryInFlight = null;
  }
};

export const useEicManuscriptCounts = (pollMs = 30000) => {
  const location = useLocation();
  const [counts, setCounts] = useState<EicCategoryCounts>({});

  const refreshCounts = useCallback((force = false) => {
    fetchEicCategoryCounts(force).then(setCounts).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCounts();

    const onRefresh = () => refreshCounts(true);
    const onFocus = () => {
      if (document.visibilityState === "visible") refreshCounts();
    };

    window.addEventListener(SIDEBAR_REFRESH_EVENT, onRefresh);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refreshCounts();
    }, pollMs);

    return () => {
      window.removeEventListener(SIDEBAR_REFRESH_EVENT, onRefresh);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(interval);
    };
  }, [refreshCounts, location.pathname, pollMs]);

  return { counts, refreshCounts };
};

export const useSidebarCounts = <T extends object>(
  role: Role,
  pollMs = 30000,
) => {
  const { authFetch, sessionId } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState<Partial<T>>({});

  const fetchCounts = useCallback(async () => {
    if (!sessionId) return;
    const { url, action } = ENDPOINTS[role];
    try {
      const res = await authFetch(`${url}?action=${action}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data === "object") setCounts(data);
    } catch (err) {
      console.error(`Error fetching ${role} sidebar counts:`, err);
    }
  }, [authFetch, role, sessionId]);

  useEffect(() => {
    // Defer the initial fetch so we don't set state synchronously during the effect
    const initial = setTimeout(fetchCounts, 0);

    // 1. Refetch on navigation (counts change after most page actions)
    // 2. Refetch when the window regains focus or the tab becomes visible
    // 3. Refetch on the global refresh event
    // 4. Poll as a fallback
    const onRefresh = () => fetchCounts();
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchCounts();
    };

    window.addEventListener(SIDEBAR_REFRESH_EVENT, onRefresh);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchCounts();
    }, pollMs);

    return () => {
      clearTimeout(initial);
      window.removeEventListener(SIDEBAR_REFRESH_EVENT, onRefresh);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(interval);
    };
    // refetch whenever the path changes
  }, [fetchCounts, location.pathname, pollMs]);

  return { counts, refreshCounts: fetchCounts };
};
