import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScheduleCallData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  preferredDate: string;
  preferredTime: string;
  timezone: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const callData: ScheduleCallData = await req.json();
    console.log("Received schedule call data:", callData);

    // Format the date and time for display
    const formattedDate = new Date(callData.preferredDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send notification email to info@oreece.com
    const emailResponse = await resend.emails.send({
      from: "Schedule Call <onboarding@resend.dev>",
      to: ["info@oreece.com"],
      subject: `New Call Request from ${callData.name} - ${formattedDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #007bff; text-align: center;">New Discovery Call Request</h2>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">📅 Requested Schedule</h3>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${callData.preferredTime} ${callData.timezone}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Contact Information</h3>
            <p><strong>Name:</strong> ${callData.name}</p>
            <p><strong>Email:</strong> ${callData.email}</p>
            ${callData.phone ? `<p><strong>Phone:</strong> ${callData.phone}</p>` : ''}
            ${callData.company ? `<p><strong>Company:</strong> ${callData.company}</p>` : ''}
          </div>

          ${callData.message ? `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Discussion Topics</h3>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
                ${callData.message.replace(/\n/g, '<br>')}
              </div>
            </div>
          ` : ''}

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0;"><strong>⏰ Action Required:</strong> Please send a calendar invite to ${callData.email} for the requested time slot.</p>
          </div>

          <div style="margin-top: 30px; padding: 15px; background-color: #e9ecef; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              This is a 30-minute discovery call request from the Oreece website.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Schedule email sent successfully:", emailResponse);

    // Send confirmation email to the user
    const confirmationResponse = await resend.emails.send({
      from: "Oreece <onboarding@resend.dev>",
      to: [callData.email],
      subject: "Call Scheduled - We'll send you a calendar invite soon!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #007bff; text-align: center;">🎉 Call Request Received!</h1>
          
          <p>Hi ${callData.name},</p>
          
          <p>Thank you for scheduling a discovery call with Oreece! We're excited to learn more about your project.</p>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
            <h3 style="color: #1976d2; margin-top: 0;">📅 Your Requested Time Slot</h3>
            <p style="font-size: 16px;"><strong>${formattedDate}</strong></p>
            <p style="font-size: 16px;"><strong>${callData.preferredTime} ${callData.timezone}</strong></p>
            <p style="color: #666; font-size: 14px; margin-bottom: 0;">30-minute discovery call</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #333;">⏰ What happens next?</h4>
            <ul style="color: #666; padding-left: 20px;">
              <li>Our team will review your request within 2 hours</li>
              <li>You'll receive a calendar invite via email</li>
              <li>We'll prepare for our discussion based on your project details</li>
            </ul>
          </div>
          
          <p>If you need to reschedule or have any questions before our call, please reply to this email or contact us directly.</p>
          
          <p>Looking forward to speaking with you!</p>
          
          <p>Best regards,<br>The Oreece Team</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 14px; text-align: center;">
            If you didn't request this call, please ignore this email.
          </p>
        </div>
      `,
    });

    console.log("Confirmation email sent:", confirmationResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Call scheduled successfully",
        emailId: emailResponse.data?.id 
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-schedule-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: "Failed to schedule call. Please try again later."
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);