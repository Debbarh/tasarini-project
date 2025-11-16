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
