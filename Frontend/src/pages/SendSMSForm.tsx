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
  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("http://3.216.182.63:8091/sendSingleSms", {
        method: "POST",
        headers: {
          "accept": "*/*",
          "Authorization": `Bearer ${token}`,
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
    <div className="space-y-8">
      <section className="page-hero max-w-5xl">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Messaging
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Send SMS Message</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Send a one-off tenant or customer notification with a clear reference and delivery target.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)] max-w-6xl">
        <Card className="form-shell border-none shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Compose message
            </CardTitle>
            <CardDescription>
              Send a single SMS message to a phone number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <Input
                  name="phone"
                  type="tel"
                  placeholder="+250XXXXXXXX"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4" />
                  Message
                </label>
                <Textarea
                  name="message"
                  placeholder="Enter your message here..."
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Maximum 160 characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Reference</label>
                <Input
                  name="reference"
                  placeholder="e.g. Payment Reminder"
                  value={formData.reference}
                  onChange={handleChange}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
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

        <Card className="data-surface border-none shadow-none">
          <CardHeader>
            <CardTitle>Message tips</CardTitle>
            <CardDescription>Keep notifications short, specific, and easy to act on.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Include the purpose of the message in the first sentence so the recipient understands it immediately.</p>
            <p>Use the reference field to make the notification easier to trace in support or payment conversations.</p>
            <p>For delivery clarity, prefer full international numbers in the expected gateway format.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SendSMSForm;
