import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  project?: string;
  message: string;
  budget?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData: ContactFormData = await req.json();
    console.log("Received contact form data:", formData);

    // Send notification email to info@oreece.com
    const emailResponse = await resend.emails.send({
      from: "Contact Form <onboarding@resend.dev>",
      to: ["info@oreece.com"],
      subject: `New Contact Form Submission from ${formData.name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Contact Information</h3>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            ${formData.phone ? `<p><strong>Phone:</strong> ${formData.phone}</p>` : ''}
            ${formData.company ? `<p><strong>Company:</strong> ${formData.company}</p>` : ''}
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Project Details</h3>
            ${formData.project ? `<p><strong>Project Type:</strong> ${formData.project}</p>` : ''}
            ${formData.budget ? `<p><strong>Budget Range:</strong> ${formData.budget}</p>` : ''}
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Message</h3>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
              ${formData.message.replace(/\n/g, '<br>')}
            </div>
          </div>

          <div style="margin-top: 30px; padding: 15px; background-color: #e9ecef; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              This email was sent from the Oreece website contact form.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Send confirmation email to the user
    const confirmationResponse = await resend.emails.send({
      from: "Oreece <onboarding@resend.dev>",
      to: [formData.email],
      subject: "Thank you for contacting Oreece!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #007bff; text-align: center;">Thank you for reaching out!</h1>
          
          <p>Hi ${formData.name},</p>
          
          <p>Thank you for contacting Oreece. We have received your message and our team will get back to you within 24 hours.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Your submission details:</h3>
            <p><strong>Project Type:</strong> ${formData.project || 'Not specified'}</p>
            <p><strong>Budget Range:</strong> ${formData.budget || 'Not specified'}</p>
          </div>
          
          <p>In the meantime, feel free to explore our portfolio and learn more about our services on our website.</p>
          
          <p>Best regards,<br>The Oreece Team</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 14px; text-align: center;">
            This is an automated confirmation email. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log("Confirmation email sent:", confirmationResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
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
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: "Failed to send email. Please try again later."
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