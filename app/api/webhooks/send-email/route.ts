import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Webhook endpoint for sending follow-up emails
 * POST /api/webhooks/send-email
 *
 * This webhook is called by the Retell AI agent when follow-up email is needed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      agent_id,
      recipient_email,
      recipient_name,
      business_name,
      email_type, // 'intro', 'follow_up', 'demo_link', 'pricing'
      custom_message,
      include_attachments,
    } = body;

    if (!agent_id || !recipient_email || !business_name || !email_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get agent and tenant information
    const { data: agent, error: agentError } = await supabase
      .from('voice_agents')
      .select('tenant_id, name')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, brand_config')
      .eq('id', agent.tenant_id)
      .single();

    const brandConfig = (tenant?.brand_config as any) || {};

    // Generate email content based on type
    const emailContent = generateEmailContent(
      email_type,
      recipient_name,
      business_name,
      custom_message,
      tenant?.name || 'Pillow AI',
      brandConfig
    );

    // TODO: Integrate with actual email service (SendGrid, Postmark, etc.)
    // For now, we'll just log the email that would be sent
    console.log('Email would be sent:', {
      to: recipient_email,
      subject: emailContent.subject,
      body: emailContent.body,
    });

    // Store email log in database for tracking
    await supabase.from('calls').insert({
      agent_id,
      tenant_id: agent.tenant_id,
      phone_number: recipient_email, // Using phone_number field for email tracking
      duration: 0,
      transcript: `Email sent: ${emailContent.subject}`,
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    // In production, you would send the actual email here:
    /*
    const emailService = getEmailService(); // SendGrid, Postmark, etc.
    await emailService.send({
      to: recipient_email,
      subject: emailContent.subject,
      html: emailContent.body,
      from: brandConfig.email || 'hello@pillow-ai.com',
    });
    */

    return NextResponse.json({
      success: true,
      message: 'Email queued for sending',
      email: {
        to: recipient_email,
        subject: emailContent.subject,
        type: email_type,
      },
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate email content based on type
 */
function generateEmailContent(
  type: string,
  recipientName: string,
  businessName: string,
  customMessage: string | undefined,
  companyName: string,
  brandConfig: any
) {
  const greeting = recipientName ? `Hi ${recipientName},` : `Hello,`;

  const templates: { [key: string]: { subject: string; body: string } } = {
    intro: {
      subject: `Great speaking with you - ${companyName}`,
      body: `
        ${greeting}

        Thank you for taking the time to speak with us today about ${companyName}.

        ${customMessage || 'I wanted to follow up on our conversation about how AI voice agents can help your business never miss a customer call.'}

        As discussed, ${companyName} provides:
        - 24/7 AI-powered phone answering
        - Appointment scheduling & calendar integration
        - Lead qualification and CRM updates
        - Multi-language support

        I'd love to schedule a brief demo to show you how this works in action.

        Please reply to this email or give us a call at your convenience.

        Best regards,
        The ${companyName} Team
      `,
    },
    follow_up: {
      subject: `Following up - ${companyName}`,
      body: `
        ${greeting}

        I wanted to follow up on our recent conversation about ${companyName}.

        ${customMessage || 'Have you had a chance to review the information we discussed?'}

        I'm here to answer any questions you might have and would be happy to:
        - Schedule a personalized demo
        - Discuss pricing options
        - Share case studies from similar businesses

        Looking forward to hearing from you.

        Best regards,
        The ${companyName} Team
      `,
    },
    demo_link: {
      subject: `Your ${companyName} Demo Link`,
      body: `
        ${greeting}

        As requested, here's your personalized demo link for ${companyName}:

        [Demo Link: https://demo.pillow-ai.com/${businessName.toLowerCase().replace(/\s+/g, '-')}]

        ${customMessage || 'This demo is pre-configured for your business and will show you exactly how our AI voice agents can help.'}

        The demo includes:
        - Sample call scenarios
        - Integration with your calendar
        - Real-time transcription
        - Analytics dashboard

        Please reach out if you have any questions!

        Best regards,
        The ${companyName} Team
      `,
    },
    pricing: {
      subject: `${companyName} Pricing & Plans`,
      body: `
        ${greeting}

        Thank you for your interest in ${companyName}. Here's our pricing information:

        **Starter Plan - $49/month**
        - 200 minutes/month (~67 calls)
        - 1 AI voice agent
        - Basic integrations

        **Growth Plan - $149/month** (Most Popular)
        - 750 minutes/month (~250 calls)
        - 3 AI voice agents
        - Advanced integrations & analytics

        **Business Plan - $349/month**
        - Unlimited minutes
        - Unlimited agents
        - Priority support & custom development

        ${customMessage || 'We also offer a free trial so you can test the platform risk-free.'}

        Ready to get started or have questions? Just reply to this email.

        Best regards,
        The ${companyName} Team
      `,
    },
  };

  return (
    templates[type] || {
      subject: `Message from ${companyName}`,
      body: customMessage || 'Thank you for your interest in our services.',
    }
  );
}

/**
 * Verify webhook endpoint is accessible
 * GET /api/webhooks/send-email
 */
export async function GET() {
  return NextResponse.json({
    webhook: 'send-email',
    status: 'active',
    description: 'Sends follow-up emails to prospects',
  });
}
