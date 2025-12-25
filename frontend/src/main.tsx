import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import "./i18n/config.ts";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import PartnerCenter from "./pages/PartnerCenter";
import PlanTrip from "./pages/PlanTrip";
import Recommendations from "./pages/Recommendations";
import BeInspired from "./pages/BeInspired";
import TravelStories from "./pages/TravelStories";
import StoryDetails from "./pages/StoryDetails";
import MyDiscoveries from "./pages/MyDiscoveries";
import TouristPoints from "./pages/TouristPoints";
import SavedItineraries from "./pages/SavedItineraries";
import PartnerApplication from "./pages/PartnerApplication";
import PartnerBlocked from "./pages/PartnerBlocked";
import CompletePartnerProfilePage from "./pages/CompletePartnerProfilePage";
import VerifyEmailRequired from "./pages/VerifyEmailRequired";
import VerifyEmail from "./pages/VerifyEmail";
import { Terms, Privacy } from "./pages/legal";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Layout from "./components/layout/Layout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Index />,
      },
      {
        path: "auth",
        element: <Auth />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "admin",
        element: (
          <ProtectedRoute requiredRoles={["admin"]}>
            <Admin />
          </ProtectedRoute>
        ),
      },
      {
        path: "partner-center",
        element: (
          <ProtectedRoute>
            <PartnerCenter />
          </ProtectedRoute>
        ),
      },
      {
        path: "plan",
        element: <PlanTrip />,
      },
      {
        path: "recommendations",
        element: <Recommendations />,
      },
      {
        path: "inspire",
        element: <BeInspired />,
      },
      {
        path: "be-inspired",
        element: <BeInspired />,
      },
      {
        path: "travel-stories",
        element: <TravelStories />,
      },
      {
        path: "travel-stories/:id",
        element: <StoryDetails />,
      },
      {
        path: "my-discoveries",
        element: (
          <ProtectedRoute>
            <MyDiscoveries />
          </ProtectedRoute>
        ),
      },
      {
        path: "tourist-points",
        element: <TouristPoints />,
      },
      {
        path: "saved-itineraries",
        element: (
          <ProtectedRoute>
            <SavedItineraries />
          </ProtectedRoute>
        ),
      },
      {
        path: "partner-application",
        element: <PartnerApplication />,
      },
      {
        path: "partner-blocked",
        element: (
          <ProtectedRoute>
            <PartnerBlocked />
          </ProtectedRoute>
        ),
      },
      {
        path: "complete-partner-profile",
        element: (
          <ProtectedRoute>
            <CompletePartnerProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "verify-email-required",
        element: <VerifyEmailRequired />,
      },
      {
        path: "verify-email",
        element: <VerifyEmail />,
      },
      {
        path: "legal/terms",
        element: <Terms />,
      },
      {
        path: "legal/privacy",
        element: <Privacy />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

// Global error handlers for external widgets and scripts
// List of known external widget domains that may have errors
const EXTERNAL_WIDGET_DOMAINS = [
  'travelpayouts',
  'hotellook',
  'tiqets.com',
  'expediagroup.com',
  'booking.com',
  'getyourguide.com',
  'viator.com',
  'omio.com',
  'omio widget'
];

window.addEventListener('unhandledrejection', (event) => {
  // Check if error is from external widget scripts
  const errorMessage = event.reason?.message || '';
  const errorStack = event.reason?.stack || '';
  const errorString = `${errorMessage} ${errorStack}`.toLowerCase();

  // Check if error is from external widgets
  const isExternalWidgetError =
    errorMessage.includes('filter') ||
    errorMessage.includes('map') ||
    errorStack.includes('main-') ||
    errorStack.includes('app.js') ||
    EXTERNAL_WIDGET_DOMAINS.some(domain => errorString.includes(domain.toLowerCase()));

  if (isExternalWidgetError) {
    // Prevent external widget errors from showing in console
    event.preventDefault();
    console.debug('External widget error suppressed:', errorMessage.substring(0, 100));
  }
});

window.addEventListener('error', (event) => {
  // Suppress external script loading errors
  const target = event.target as HTMLScriptElement | HTMLLinkElement | HTMLImageElement;
  const tagName = target?.tagName;

  if (tagName === 'SCRIPT' || tagName === 'LINK' || tagName === 'IMG') {
    const src = (target as any).src || (target as any).href || '';
    const isExternalWidget = EXTERNAL_WIDGET_DOMAINS.some(domain =>
      src.toLowerCase().includes(domain.toLowerCase())
    );

    if (isExternalWidget) {
      event.preventDefault();
      console.debug('External widget resource failed to load:', src.substring(0, 100));
    }
  }
}, true); // Use capture phase to catch errors early

// Intercept console errors and warnings from external widgets
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  const message = args.join(' ').toLowerCase();
  const isExternalWidget =
    EXTERNAL_WIDGET_DOMAINS.some(domain => message.includes(domain.toLowerCase())) ||
    message.includes('getboundingclientrect') ||
    message.includes('x-frame-options') ||
    message.includes('failed to load resource') ||
    message.includes('404') && EXTERNAL_WIDGET_DOMAINS.some(domain => message.includes(domain));

  // Suppress external widget errors
  if (!isExternalWidget) {
    originalError.apply(console, args);
  }
};

console.warn = (...args: any[]) => {
  const message = args.join(' ').toLowerCase();
  const isExternalWidget =
    EXTERNAL_WIDGET_DOMAINS.some(domain => message.includes(domain.toLowerCase())) ||
    message.includes('deprecated') ||
    message.includes('omio widget');

  // Suppress external widget warnings
  if (!isExternalWidget) {
    originalWarn.apply(console, args);
  }
};

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (React Query v5)
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>
);
