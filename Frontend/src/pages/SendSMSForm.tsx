import { useState } from "react";
import { Phone, Mail, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const SendSMSForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    phone: "",
    message: "",
    reference: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const user = localStorage.getItem("user");
  let token = "";

  try {
    if (user) {
      const userData = JSON.parse(user);
      token = userData.token;
    } else {
      console.error("No user found in localStorage");
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("http://3.216.182.63:8091/sendSingleSms", {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: formData.phone,
          message: formData.message,
          reference: formData.reference || "SMS Notification",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast({
        title: "SMS Sent Successfully",
        description: `Message sent to ${formData.phone}`,
      });
      setFormData({ phone: "", message: "", reference: "" });
    } catch (error) {
      toast({
        title: "Failed to Send SMS",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark text-white min-h-full space-y-8">
      <section className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[28px] p-8 max-w-5xl">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            Messaging
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Send SMS Message
            </h1>
            <p className="mt-2 text-sm text-blue-200 md:text-base">
              Send a one-off tenant or customer notification with a clear
              reference and delivery target.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)] max-w-6xl">
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Send className="w-5 h-5" />
              Compose message
            </CardTitle>
            <CardDescription className="text-blue-200">
              Send a single SMS message to a phone number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-blue-100">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <Input
                  name="phone"
                  type="tel"
                  variant="dark"
                  placeholder="+250XXXXXXXX"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-blue-100">
                  <Mail className="w-4 h-4" />
                  Message
                </label>
                <Textarea
                  name="message"
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-200/50 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/30"
                  placeholder="Enter your message here..."
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  required
                />
                <p className="text-xs text-blue-200">Maximum 160 characters</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-100">
                  Reference
                </label>
                <Input
                  name="reference"
                  variant="dark"
                  placeholder="e.g. Payment Reminder"
                  value={formData.reference}
                  onChange={handleChange}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send SMS
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Message tips</CardTitle>
            <CardDescription className="text-blue-200">
              Keep notifications short, specific, and easy to act on.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-200">
            <p>
              Include the purpose of the message in the first sentence so the
              recipient understands it immediately.
            </p>
            <p>
              Use the reference field to make the notification easier to trace
              in support or payment conversations.
            </p>
            <p>
              For delivery clarity, prefer full international numbers in the
              expected gateway format.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SendSMSForm;
