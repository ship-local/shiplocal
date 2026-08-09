/** Dashboard-local stats shapes (kept here so builds don't depend on shared dist freshness). */

export interface AccountStats {
  projects: number;
  linksGenerated: number;
  linksLast7Days: number;
  linksLast30Days: number;
  onlineNow: number;
  npm: {
    package: string;
    downloadsLastWeek: number | null;
    downloadsLastMonth: number | null;
    fetchedAt: string | null;
  };
}

export interface AdminPlatformStats {
  users: {
    total: number;
    last7Days: number;
    last30Days: number;
  };
  projects: {
    total: number;
    last7Days: number;
    last30Days: number;
  };
  links: {
    total: number;
    last7Days: number;
    last30Days: number;
    onlineNow: number;
  };
  activeAccounts: {
    last7Days: number;
    last30Days: number;
  };
  npm: {
    package: string;
    downloadsLastWeek: number | null;
    downloadsLastMonth: number | null;
    fetchedAt: string | null;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  }>;
}
