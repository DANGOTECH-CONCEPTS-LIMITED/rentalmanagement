
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home, Users, FileText, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">Property Management Workflow System</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">A comprehensive solution for managing properties, tenants, and landlords with an intuitive workflow system.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Home className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Admin Dashboard</h2>
            <p className="text-gray-600 mb-4">Manage properties, landlords, and generate comprehensive reports.</p>
            <ul className="text-gray-500 space-y-2 mb-4">
              <li className="flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-blue-500" />
                Register landlords and properties
              </li>
              <li className="flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-blue-500" />
                Generate analytics reports
              </li>
              <li className="flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-blue-500" />
                Manage system users
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Users className="text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Landlord Dashboard</h2>
            <p className="text-gray-600 mb-4">Manage your properties, tenants, and rental agreements efficiently.</p>
            <ul className="text-gray-500 space-y-2 mb-4">
              <li className="flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-green-500" />
                Register tenants and assign properties
              </li>
              <li className="flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-green-500" />
                Manage rental contracts
              </li>
              <li className="flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-green-500" />
                Handle tenant complaints
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <FileText className="text-red-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Tenant Dashboard</h2>
            <p className="text-gray-600 mb-4">View property details, make payments, and submit maintenance requests.</p>
            <ul className="text-gray-500 space-y-2 mb-4">
              <li className="flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-red-500" />
                View property details
              </li>
              <li className="flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-red-500" />
                Make rent payments
              </li>
              <li className="flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-red-500" />
                Submit and track complaints
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Ready to get started?</h2>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link to="/">Sign In to Dashboard</Link>
          </Button>
          <p className="mt-4 text-sm text-gray-500">
            For demo purposes, use these credentials:
            <span className="block mt-1">Admin: admin@example.com | Landlord: landlord@example.com | Tenant: tenant@example.com</span>
          </p>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex justify-center">
            <img 
              src="/lovable-uploads/c5211837-4e5e-46a0-9d82-b74d0f2dc7b5.png" 
              alt="Workflow Diagram" 
              className="max-w-full h-auto rounded-lg shadow-md" 
            />
          </div>
          <p className="text-center mt-4 text-sm text-gray-500">
            Workflow diagram of our property management system
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
