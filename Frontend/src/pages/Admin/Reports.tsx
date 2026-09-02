import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download } from "lucide-react";

const occupancyData = [
  { month: "Jan", rate: 82 },
  { month: "Feb", rate: 85 },
  { month: "Mar", rate: 90 },
  { month: "Apr", rate: 88 },
  { month: "May", rate: 91 },
  { month: "Jun", rate: 93 },
  { month: "Jul", rate: 94 },
  { month: "Aug", rate: 95 },
  { month: "Sep", rate: 94 },
  { month: "Oct", rate: 92 },
  { month: "Nov", rate: 90 },
  { month: "Dec", rate: 88 },
];

const revenueData = [
  { month: "Jan", amount: 35000 },
  { month: "Feb", amount: 36500 },
  { month: "Mar", amount: 38000 },
  { month: "Apr", amount: 37500 },
  { month: "May", amount: 39000 },
  { month: "Jun", amount: 41000 },
  { month: "Jul", amount: 42000 },
  { month: "Aug", amount: 43500 },
  { month: "Sep", amount: 43000 },
  { month: "Oct", amount: 42500 },
  { month: "Nov", amount: 41000 },
  { month: "Dec", amount: 40000 },
];

const propertyTypeData = [
  { name: "Apartments", value: 45 },
  { name: "Houses", value: 30 },
  { name: "Condos", value: 15 },
  { name: "Commercial", value: 10 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const Reports = () => {
  const [timeframe, setTimeframe] = useState("yearly");

  return (
    <div className="dark text-white min-h-full space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between sm:gap-4">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Reports & Analytics
          </h1>
          <p className="text-blue-200">
            View performance metrics and generate reports
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger>
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="flex items-center gap-2 w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 bg-white/10 p-2 rounded-2xl border border-white/20">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-blue-500/30 data-[state=active]:text-white text-blue-100"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="financials"
            className="data-[state=active]:bg-blue-500/30 data-[state=active]:text-white text-blue-100"
          >
            Financials
          </TabsTrigger>
          <TabsTrigger
            value="occupancy"
            className="data-[state=active]:bg-blue-500/30 data-[state=active]:text-white text-blue-100"
          >
            Occupancy
          </TabsTrigger>
          <TabsTrigger
            value="properties"
            className="data-[state=active]:bg-blue-500/30 data-[state=active]:text-white text-blue-100"
          >
            Properties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Occupancy Rate</CardTitle>
                <CardDescription className="text-blue-200">
                  Monthly occupancy percentage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={occupancyData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.15)"
                      />
                      <XAxis dataKey="month" tick={{ fill: "#fff" }} />
                      <YAxis tick={{ fill: "#fff" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.9)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                      />
                      <Legend wrapperStyle={{ color: "#fff" }} />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke="#38bdf8"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Revenue</CardTitle>
                <CardDescription className="text-blue-200">
                  Monthly revenue in dollars
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.15)"
                      />
                      <XAxis dataKey="month" tick={{ fill: "#fff" }} />
                      <YAxis tick={{ fill: "#fff" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.9)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                      />
                      <Legend wrapperStyle={{ color: "#fff" }} />
                      <Bar dataKey="amount" fill="#34d399" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">
                Property Distribution
              </CardTitle>
              <CardDescription className="text-blue-200">
                Properties by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={propertyTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {propertyTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials">
          <Card className="p-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <h3 className="text-lg font-medium mb-4 text-white">
              Financial Reports (Coming Soon)
            </h3>
            <p className="text-blue-200">
              Detailed financial analytics will be available in this section.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy">
          <Card className="p-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <h3 className="text-lg font-medium mb-4 text-white">
              Occupancy Reports (Coming Soon)
            </h3>
            <p className="text-blue-200">
              Detailed occupancy analytics will be available in this section.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="properties">
          <Card className="p-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <h3 className="text-lg font-medium mb-4 text-white">
              Property Reports (Coming Soon)
            </h3>
            <p className="text-blue-200">
              Detailed property analytics will be available in this section.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
