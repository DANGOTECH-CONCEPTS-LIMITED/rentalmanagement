
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Home, Users, FileText, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/80 px-6 py-12 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.32)] backdrop-blur md:px-10 lg:px-12">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.16),_transparent_62%)] lg:block" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex w-fit items-center rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Rental Operations Platform
              </span>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl lg:text-6xl">
                  Property Management Workflow System
                </h1>
                <p className="max-w-2xl text-base text-slate-600 md:text-lg">
                  A unified workspace for property administration, landlord operations, tenant service, utility management, and audit visibility.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="px-8">
                  <Link to="/">Sign In to Dashboard</Link>
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                Demo access: Admin: admin@example.com | Landlord: landlord@example.com | Tenant: tenant@example.com
              </p>
            </div>

            <Card className="border-none bg-slate-950 text-white shadow-none">
              <CardContent className="space-y-4 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Platform Highlights</p>
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-3xl font-semibold">3</p>
                    <p className="mt-1 text-sm text-slate-300">Operational dashboards for admin, landlord, and tenant workflows.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-3xl font-semibold">1</p>
                    <p className="mt-1 text-sm text-slate-300">Integrated utility and payment layer with logging and analytics support.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          <Card className="border-none bg-white/85 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.28)] transition-transform duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Home className="text-blue-600" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">Admin Dashboard</h2>
              <p className="mb-4 text-gray-600">Manage properties, landlords, and generate comprehensive reports.</p>
              <ul className="mb-4 space-y-2 text-gray-500">
                <li className="flex items-center">
                  <ArrowRight className="mr-2 h-4 w-4 text-blue-500" />
                  Register landlords and properties
                </li>
                <li className="flex items-center">
                  <ArrowRight className="mr-2 h-4 w-4 text-blue-500" />
                  Generate analytics reports
                </li>
                <li className="flex items-center">
                  <ArrowRight className="mr-2 h-4 w-4 text-blue-500" />
                  Manage system users
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none bg-white/85 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.28)] transition-transform duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Users className="text-green-600" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">Landlord Dashboard</h2>
              <p className="mb-4 text-gray-600">Manage your properties, tenants, and rental agreements efficiently.</p>
              <ul className="mb-4 space-y-2 text-gray-500">
                <li className="flex items-center">
                  <ArrowRight className="mr-2 h-4 w-4 text-green-500" />
                  Register tenants and assign properties
                </li>
                <li className="flex items-center">
                  <ArrowRight className="mr-2 h-4 w-4 text-green-500" />
                  Manage rental contracts
                </li>
                <li className="flex items-center">
                  <ArrowRight className="mr-2 h-4 w-4 text-green-500" />
                  Handle tenant complaints
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none bg-white/85 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.28)] transition-transform duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <FileText className="text-red-600" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">Tenant Dashboard</h2>
              <p className="mb-4 text-gray-600">View property details, make payments, and submit maintenance requests.</p>
              <ul className="mb-4 space-y-2 text-gray-500">
                <li className="flex items-center">
                  <ArrowRight className="mr-2 h-4 w-4 text-red-500" />
                  View property details
                </li>
                <li className="flex items-center">
                  <ArrowRight className="mr-2 h-4 w-4 text-red-500" />
                  Make rent payments
                </li>
                <li className="flex items-center">
                  <ArrowRight className="mr-2 h-4 w-4 text-red-500" />
                  Submit and track complaints
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 rounded-[30px] border border-slate-200/70 bg-white/85 p-6 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.24)] md:p-8">
          <div className="flex justify-center overflow-hidden rounded-[24px] bg-slate-100 p-4">
            <img
              src="/lovable-uploads/c5211837-4e5e-46a0-9d82-b74d0f2dc7b5.png"
              alt="Workflow Diagram"
              className="h-auto max-w-full rounded-[20px] shadow-md"
            />
          </div>
          <p className="mt-4 text-center text-sm text-gray-500">
            Workflow diagram of our property management system
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
