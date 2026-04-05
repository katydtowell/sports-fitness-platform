/**
 * App — top-level component that handles page routing.
 *
 * Wraps every page in the shared Layout (TopNav + Sidebar) and switches
 * the main content area based on the active navigation item.
 *
 * Subpages (e.g. /clients/john-smith) are handled via the nav context's
 * `subpage` slug, which is synced to the browser URL.
 */

import { Layout } from "./components/layout/Layout";
import { PinnedPagesProvider } from "./components/layout/PinnedPagesContext";
import { NavProvider, useNav } from "./components/layout/NavContext";
import { getClientById, getClientBySlug, clientSlug } from "./data/clients";

// ── Page components ──────────────────────────────────────────────────────────
import { AdminPage } from "./components/pages/AdminPage";
import { PlaceholderPage } from "./components/pages/PlaceholderPage";
import { ADMIN_SUBPAGE_ITEMS } from "./components/layout/navItems";
import { CheckInPage } from "./components/pages/CheckInPage";
import { ClientsPage } from "./components/pages/ClientsPage";
import { ClientProfilePage } from "./components/pages/ClientProfilePage";
import { DashboardPage } from "./components/pages/DashboardPage";
import { DocumentsPage } from "./components/pages/DocumentsPage";
import { EmailCampaignsPage } from "./components/pages/EmailCampaignsPage";
import { EquipmentPage } from "./components/pages/EquipmentPage";
import { EZLeaguesPage } from "./components/pages/EZLeaguesPage";
import { EZSignupPage } from "./components/pages/EZSignupPage";
import { GroupsPage } from "./components/pages/GroupsPage";
import { PointOfSalePage } from "./components/pages/PointOfSalePage";
import { RentalsPage } from "./components/pages/RentalsPage";
import { ReportsPage } from "./components/pages/ReportsPage";
import { SchedulePage } from "./components/pages/SchedulePage";
import { TimeClockPage } from "./components/pages/TimeClockPage";

// ── App (outer) ──────────────────────────────────────────────────────────────

export default function App() {
  return (
    <PinnedPagesProvider>
      <NavProvider>
        <AppRouter />
      </NavProvider>
    </PinnedPagesProvider>
  );
}

// ── Router (reads shared nav state) ──────────────────────────────────────────

function AppRouter() {
  const nav = useNav();

  function renderPage() {
    const id = nav.activeId;

    // "Home" maps to the Dashboard
    if (id === "home") return <DashboardPage />;

    // Clients has a sub-page: Client Profile (driven by URL slug)
    if (id === "clients") {
      if (nav.subpage) {
        const client = getClientBySlug(nav.subpage);
        if (client) {
          return (
            <ClientProfilePage
              key={client.id}
              clientId={client.id}
              onNavigateToClients={() => nav.setSubpage(null)}
            />
          );
        }
        // Unknown slug — fall back to the list
      }
      return (
        <ClientsPage
          onOpenClient={(clientId) => {
            const record = getClientById(clientId);
            if (record) {
              nav.setSubpage(clientSlug(record));
            }
          }}
        />
      );
    }

    // Admin has subpages: /admin/billing, /admin/client-settings, etc.
    if (id === "admin") {
      if (nav.subpage) {
        const subItem = ADMIN_SUBPAGE_ITEMS.find(
          (s) => s.id === `admin/${nav.subpage}`
        );
        if (subItem) {
          return (
            <PlaceholderPage
              key={subItem.id}
              title={subItem.label}
              icon={subItem.icon}
              description={`Admin › ${subItem.label} — coming soon.`}
            />
          );
        }
        // Unknown slug — fall back to admin dashboard
      }
      return (
        <AdminPage
          onNavigateToSubpage={(subpageId) => {
            nav.setSubpage(subpageId);
          }}
        />
      );
    }

    switch (id) {
      case "check-in":        return <CheckInPage />;
      case "dashboard":       return <DashboardPage />;
      case "documents":       return <DocumentsPage />;
      case "email-campaigns": return <EmailCampaignsPage />;
      case "equipment":       return <EquipmentPage />;
      case "ezleagues":       return <EZLeaguesPage />;
      case "ezsignup":        return <EZSignupPage />;
      case "groups":          return <GroupsPage />;
      case "point-of-sale":   return <PointOfSalePage />;
      case "rentals":         return <RentalsPage />;
      case "reports":         return <ReportsPage />;
      case "schedule":        return <SchedulePage />;
      case "time-clock":      return <TimeClockPage />;
      default:                return <DashboardPage />;
    }
  }

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
}
