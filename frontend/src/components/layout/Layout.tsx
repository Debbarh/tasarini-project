import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Suspense pour le lazy-loading des pages (code-splitting) */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;