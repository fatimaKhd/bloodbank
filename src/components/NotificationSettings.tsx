import { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Bell, Mail, Loader2, AlertCircle } from "lucide-react";

export const NotificationSettings = () => {
  const [email, setEmail] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    const fetchEmailAndPreferences = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch("http://localhost:5000/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.user?.email) {
          setEmail(data.user.email);
          setEmailEnabled(data.user.email_notifications_enabled ?? true);
        } else {
          toast.error("Failed to fetch user info");
        }
      } catch (err) {
        toast.error("Error loading settings");
      }
    };

    fetchEmailAndPreferences();
  }, []);

  const handleEmailToggle = async (checked: boolean) => {
    setEmailEnabled(checked);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("http://localhost:5000/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email_notifications_enabled: checked })
      });
      if (!res.ok) {
        toast.error("Failed to update preference");
      }
    } catch (err) {
      toast.error("Error saving preference");
    }
  };

  const handleTestEmail = async () => {
    setTestLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("http://localhost:5000/api/send-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`

        },
        body: JSON.stringify({
          recipient: email,
          subject: "Test Notification",
          message: "This is a test email from LifeFlow.",
          event: "test"
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Test email sent");
      } else {
        toast.error(result.message || "Failed to send test email");
      }
    } catch (err) {
      toast.error("Test email failed");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="h-5 w-5 mr-2" /> Notification Settings
        </CardTitle>
        <CardDescription>Email notifications setup</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* <Alert variant="default" className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle>Email Notification Mode</AlertTitle>
          <AlertDescription>Real email sending is enabled for your account.</AlertDescription>
        </Alert> */}

        <div className="grid gap-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" value={email} readOnly />
        </div>

        <div className="flex items-center justify-between">
          <Label>Email Notifications</Label>
          <Switch checked={emailEnabled} onCheckedChange={handleEmailToggle} />
        </div>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button variant="secondary" onClick={handleTestEmail} disabled={testLoading}>
          {testLoading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
          ) : (
            <><Mail className="h-4 w-4 mr-2" /> Test Email</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
