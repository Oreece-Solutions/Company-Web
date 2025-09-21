import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Phone, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleCallProps {
  variant?: "default" | "outline" | "ghost";
  className?: string;
  children?: React.ReactNode;
}

const ScheduleCall = ({ variant = "default", className = "", children }: ScheduleCallProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    preferredDate: "",
    preferredTime: "",
    timezone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-schedule-email', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Call scheduled successfully!",
        description: "We'll send you a calendar invite within 2 hours.",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        preferredDate: "",
        preferredTime: "",
        timezone: "",
        message: "",
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error scheduling call:", error);
      toast({
        title: "Error scheduling call",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={`animate-scale-in ${className}`}>
          {children || (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Call
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Phone className="mr-2 h-5 w-5 text-primary" />
            Schedule a Discovery Call
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="call-name">Full Name *</Label>
              <Input
                id="call-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="call-email">Email *</Label>
              <Input
                id="call-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="call-phone">Phone Number</Label>
              <Input
                id="call-phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="call-company">Company</Label>
              <Input
                id="call-company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="preferredDate">Preferred Date *</Label>
              <Input
                id="preferredDate"
                name="preferredDate"
                type="date"
                value={formData.preferredDate}
                onChange={handleChange}
                required
                className="mt-1"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="preferredTime">Preferred Time *</Label>
              <select
                id="preferredTime"
                name="preferredTime"
                value={formData.preferredTime}
                onChange={handleChange}
                required
                className="mt-1 w-full p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select time</option>
                <option value="09:00">9:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="12:00">12:00 PM</option>
                <option value="13:00">1:00 PM</option>
                <option value="14:00">2:00 PM</option>
                <option value="15:00">3:00 PM</option>
                <option value="16:00">4:00 PM</option>
                <option value="17:00">5:00 PM</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="timezone">Timezone *</Label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              required
              className="mt-1 w-full p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select timezone</option>
              <option value="EST">EST (Eastern Time)</option>
              <option value="CST">CST (Central Time)</option>
              <option value="MST">MST (Mountain Time)</option>
              <option value="PST">PST (Pacific Time)</option>
              <option value="GMT">GMT (Greenwich Mean Time)</option>
              <option value="CET">CET (Central European Time)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="call-message">What would you like to discuss?</Label>
            <Textarea
              id="call-message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={3}
              className="mt-1"
              placeholder="Brief description of your project or goals..."
            />
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              30-minute discovery call • Free consultation
            </span>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full animate-fade-in"
          >
            {isSubmitting ? (
              "Scheduling..."
            ) : (
              <>
                Schedule Call
                <Send className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleCall;