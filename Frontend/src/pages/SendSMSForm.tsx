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
    <Card className="w-full mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Send SMS Message
        </CardTitle>
        <CardDescription>
          Send a single SMS message to a phone number
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
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
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Message
            </label>
            <Textarea
              name="message"
              placeholder="Enter your message here..."
              value={formData.message}
              onChange={handleChange}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Maximum 160 characters
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reference (Optional)</label>
            <Input
              name="reference"
              placeholder="e.g. Payment Reminder"
              value={formData.reference}
              onChange={handleChange}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
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
  );
};

export default SendSMSForm;
