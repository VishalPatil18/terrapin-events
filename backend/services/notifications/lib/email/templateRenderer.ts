/**
 * TEMS Notification System - Template Renderer
 * 
 * Renders email templates using MJML for responsive design and Handlebars for dynamic content.
 * Converts MJML to HTML and injects data using Handlebars templates.
 * 
 * @module notifications/lib/email/templateRenderer
 */

import mjml2html from 'mjml';
import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { EmailTemplateData } from '../../types/notification.types';

/**
 * Template rendering result
 */
export interface TemplateRenderResult {
  success: boolean;
  html?: string;
  text?: string;
  error?: string;
}

/**
 * Cache for compiled templates
 */
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Base templates directory
 */
const TEMPLATES_DIR = join(__dirname, '../../templates');

/**
 * Register Handlebars helpers for common operations
 */
function registerHelpers() {
  // Format date helper
  Handlebars.registerHelper('formatDate', (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  // Format time helper
  Handlebars.registerHelper('formatTime', (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  });

  // Format date-time helper
  Handlebars.registerHelper('formatDateTime', (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  });

  // Uppercase helper
  Handlebars.registerHelper('uppercase', (str: string) => {
    return str ? str.toUpperCase() : '';
  });

  // Conditional helper
  Handlebars.registerHelper('eq', (a: any, b: any) => {
    return a === b;
  });

  // Current year helper
  Handlebars.registerHelper('currentYear', () => {
    return new Date().getFullYear();
  });
}

// Register helpers on module load
registerHelpers();

/**
 * Load and compile an MJML template
 * 
 * @param templateName - Name of the template file (without .mjml extension)
 * @returns Compiled Handlebars template
 */
async function loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
  // Check cache first
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  try {
    // Read MJML template file
    const templatePath = join(TEMPLATES_DIR, `${templateName}.mjml`);
    const mjmlContent = await readFile(templatePath, 'utf-8');

    // Compile MJML to HTML
    const { html, errors } = mjml2html(mjmlContent, {
      validationLevel: 'soft',
      minify: true,
    });

    if (errors.length > 0) {
      console.warn(`MJML compilation warnings for ${templateName}:`, errors);
    }

    // Compile with Handlebars
    const template = Handlebars.compile(html);

    // Cache the compiled template
    templateCache.set(templateName, template);

    return template;
  } catch (error: any) {
    throw new Error(`Failed to load template ${templateName}: ${error.message}`);
  }
}

/**
 * Render an email template with data
 * 
 * @param templateName - Name of the template file
 * @param data - Data to inject into the template
 * @returns Rendered HTML and plain text versions
 */
export async function renderTemplate(
  templateName: string,
  data: EmailTemplateData
): Promise<TemplateRenderResult> {
  try {
    // Load and compile template
    const template = await loadTemplate(templateName);

    // Render HTML with data
    const html = template(data);

    // Generate plain text version
    const text = generatePlainText(templateName, data);

    return {
      success: true,
      html,
      text,
    };
  } catch (error: any) {
    console.error(`Template rendering error for ${templateName}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate plain text version of email
 * Uses simple template strings for text emails
 * 
 * @param templateName - Template name to determine content
 * @param data - Email data
 * @returns Plain text email content
 */
function generatePlainText(templateName: string, data: EmailTemplateData): string {
  switch (templateName) {
    case 'registration-confirmation':
      return `
Dear ${data.userName},

Your registration for "${data.eventTitle}" has been confirmed!

Event Details:
- Date: ${data.eventDate}
- Time: ${data.eventTime}
- Location: ${data.eventLocation}

Your ticket number is: ${data.ticketNumber}

View your ticket: ${data.eventUrl}

If you need to cancel your registration, please visit your dashboard at ${data.preferencesUrl}

Questions? Contact us at ${data.supportUrl}

To unsubscribe from notifications, visit: ${data.unsubscribeUrl}

Best regards,
Terrapin Events Team
      `.trim();

    case 'waitlist-added':
      return `
Dear ${data.userName},

You've been added to the waitlist for "${data.eventTitle}".

Event Details:
- Date: ${data.eventDate}
- Location: ${data.eventLocation}
- Your position: #${data.waitlistPosition}

We'll notify you immediately if a spot becomes available!

Manage your registrations: ${data.preferencesUrl}

To unsubscribe from notifications, visit: ${data.unsubscribeUrl}

Best regards,
Terrapin Events Team
      `.trim();

    case 'waitlist-promoted':
      return `
Dear ${data.userName},

Great news! A spot has opened up for "${data.eventTitle}"!

You have 24 hours to accept your registration. After that, the spot will go to the next person on the waitlist.

Event Details:
- Date: ${data.eventDate}
- Time: ${data.eventTime}
- Location: ${data.eventLocation}

Accept your spot now: ${data.eventUrl}

To unsubscribe from notifications, visit: ${data.unsubscribeUrl}

Best regards,
Terrapin Events Team
      `.trim();

    case 'registration-cancelled':
      return `
Dear ${data.userName},

Your registration for "${data.eventTitle}" has been cancelled.

Event Details:
- Date: ${data.eventDate}
- Location: ${data.eventLocation}

If you'd like to register again, visit: ${data.eventUrl}

To unsubscribe from notifications, visit: ${data.unsubscribeUrl}

Best regards,
Terrapin Events Team
      `.trim();

    case 'event-reminder-24h':
      return `
Dear ${data.userName},

This is a reminder that "${data.eventTitle}" is happening tomorrow!

Event Details:
- Date: ${data.eventDate}
- Time: ${data.eventTime}
- Location: ${data.eventLocation}

View your ticket: ${data.eventUrl}

To unsubscribe from notifications, visit: ${data.unsubscribeUrl}

Best regards,
Terrapin Events Team
      `.trim();

    case 'event-reminder-1h':
      return `
Dear ${data.userName},

"${data.eventTitle}" starts in 1 hour!

Event Details:
- Time: ${data.eventTime}
- Location: ${data.eventLocation}

View your ticket: ${data.eventUrl}

To unsubscribe from notifications, visit: ${data.unsubscribeUrl}

Best regards,
Terrapin Events Team
      `.trim();

    case 'event-updated':
      return `
Dear ${data.userName},

Important: "${data.eventTitle}" has been updated.

${data.metadata?.changes?.join('\n') || 'Please check the event page for details.'}

View updated details: ${data.eventUrl}

To unsubscribe from notifications, visit: ${data.unsubscribeUrl}

Best regards,
Terrapin Events Team
      `.trim();

    case 'event-cancelled':
      return `
Dear ${data.userName},

We regret to inform you that "${data.eventTitle}" has been cancelled.

${data.metadata?.reason ? `Reason: ${data.metadata.reason}` : ''}

If you registered for this event, your registration has been automatically cancelled.

Browse other events: ${data.eventUrl}

To unsubscribe from notifications, visit: ${data.unsubscribeUrl}

Best regards,
Terrapin Events Team
      `.trim();

    default:
      return `
Dear ${data.userName},

This is a notification regarding "${data.eventTitle}".

Event Details:
- Date: ${data.eventDate}
- Location: ${data.eventLocation}

View event: ${data.eventUrl}

To unsubscribe from notifications, visit: ${data.unsubscribeUrl}

Best regards,
Terrapin Events Team
      `.trim();
  }
}

/**
 * Clear template cache (useful for development/testing)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Preview a template (for testing/development)
 * 
 * @param templateName - Template name
 * @param data - Sample data
 * @returns Rendered HTML
 */
export async function previewTemplate(
  templateName: string,
  data: EmailTemplateData
): Promise<string> {
  const result = await renderTemplate(templateName, data);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.html!;
}

export default {
  renderTemplate,
  clearTemplateCache,
  previewTemplate,
};
