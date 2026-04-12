
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Compass, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // Function to determine what home page to return to based on the current path
  const getHomePath = () => {
    const path = location.pathname;
    if (path.includes('/admin-dashboard')) return '/admin-dashboard';
    if (path.includes('/landlord-dashboard')) return '/landlord-dashboard';
    if (path.includes('/tenant-dashboard')) return '/tenant-dashboard';
    return '/';
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.1),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] p-4">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center">
        <Card className="w-full border-none bg-white/90 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.35)] backdrop-blur">
          <CardContent className="grid gap-8 p-8 md:grid-cols-[minmax(0,1.1fr)_minmax(240px,0.9fr)] md:p-10">
            <div className="space-y-6">
              <div className="inline-flex rounded-full bg-red-500/10 p-3 text-red-600">
                <SearchX className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-500">Error 404</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">This page does not exist.</h1>
                <p className="mt-4 max-w-xl text-base text-slate-600">
                  The route may have changed, the page may have been removed, or the link may be incomplete.
                </p>
              </div>
              <Button asChild className="inline-flex w-fit items-center">
                <Link to={getHomePath()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Dashboard
                </Link>
              </Button>
            </div>

            <div className="rounded-[28px] bg-slate-950 p-6 text-white">
              <div className="flex items-center gap-3 text-slate-200">
                <Compass className="h-5 w-5" />
                <span className="text-sm font-medium">Navigation hint</span>
              </div>
              <div className="mt-6 space-y-4 text-sm text-slate-300">
                <p>Check the left navigation for the correct section before retrying the route.</p>
                <p>If you followed a saved link, it may point to an older screen path.</p>
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200">
                  Requested path: {location.pathname}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
