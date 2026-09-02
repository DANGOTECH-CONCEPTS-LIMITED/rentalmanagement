import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";

const SystemSettings = () => {
  const [generalSettings, setGeneralSettings] = useState({
    companyName: "Property Management Co.",
    supportEmail: "support@property-mgmt.com",
    contactPhone: "256-123-4567",
    currency: "USD",
    timeZone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    paymentReminders: true,
    maintenanceAlerts: true,
    leaseEndReminders: true,
    marketingEmails: false,
  });

  const handleGeneralSettingsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setGeneralSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationToggle = (setting: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof notificationSettings],
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setGeneralSettings((prev) => ({ ...prev, [name]: value }));
  };

  const saveSettings = (settingType: string) => {
    toast({
      title: "Settings Updated",
      description: `${settingType} settings have been saved successfully.`,
    });
  };

  return (
    <div className="dark text-white min-h-full space-y-6 px-4 md:px-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          System Settings
        </h1>
        <p className="text-blue-200">
          Configure system-wide settings and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 flex overflow-x-auto space-x-4 bg-white/10 p-2 rounded-2xl border border-white/20">
          <TabsTrigger
            value="general"
            className="text-base md:text-lg data-[state=active]:bg-blue-500/30 data-[state=active]:text-white text-blue-100"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="text-base md:text-lg data-[state=active]:bg-blue-500/30 data-[state=active]:text-white text-blue-100"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="text-base md:text-lg data-[state=active]:bg-blue-500/30 data-[state=active]:text-white text-blue-100"
          >
            Security
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="text-base md:text-lg data-[state=active]:bg-blue-500/30 data-[state=active]:text-white text-blue-100"
          >
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">General Settings</CardTitle>
              <CardDescription className="text-blue-200">
                Manage basic system configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    variant="dark"
                    value={generalSettings.companyName}
                    onChange={handleGeneralSettingsChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    name="supportEmail"
                    variant="dark"
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={handleGeneralSettingsChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    variant="dark"
                    value={generalSettings.contactPhone}
                    onChange={handleGeneralSettingsChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={generalSettings.currency}
                    onValueChange={(value) =>
                      handleSelectChange("currency", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                      <SelectItem value="CAD">CAD (Canadian Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeZone">Time Zone</Label>
                  <Select
                    value={generalSettings.timeZone}
                    onValueChange={(value) =>
                      handleSelectChange("timeZone", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">
                        Eastern Time (ET)
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        Central Time (CT)
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        Mountain Time (MT)
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Pacific Time (PT)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={generalSettings.dateFormat}
                    onValueChange={(value) =>
                      handleSelectChange("dateFormat", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => saveSettings("General")}
                className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg"
              >
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">
                Notification Settings
              </CardTitle>
              <CardDescription className="text-blue-200">
                Configure how and when notifications are sent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {Object.keys(notificationSettings).map((setting) => (
                  <div
                    className="flex items-center justify-between"
                    key={setting}
                  >
                    <div>
                      <Label htmlFor={setting} className="text-base">
                        {setting.replace(/([A-Z])/g, " $1")}
                      </Label>
                      <p className="text-sm text-blue-200">
                        Enable{" "}
                        {setting.replace(/([A-Z])/g, " $1").toLowerCase()}
                      </p>
                    </div>
                    <Switch
                      id={setting}
                      className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-white/20"
                      checked={
                        notificationSettings[
                          setting as keyof typeof notificationSettings
                        ]
                      }
                      onCheckedChange={() => handleNotificationToggle(setting)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => saveSettings("Notification")}
                className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg"
              >
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Security Settings</CardTitle>
              <CardDescription className="text-blue-200">
                Configure system security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-blue-200">Security settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Integrations</CardTitle>
              <CardDescription className="text-blue-200">
                Connect with third-party services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-blue-200">Integration settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettings;
