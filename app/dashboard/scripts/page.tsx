'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Save, Play, Copy } from 'lucide-react';

interface ScriptTemplate {
  id: string;
  name: string;
  industry: string;
  template: string;
}

const scriptTemplates: ScriptTemplate[] = [
  {
    id: 'receptionist',
    name: 'General Receptionist',
    industry: 'All',
    template: `You are a professional receptionist for [Business Name]. Your role is to:

1. Greet callers warmly and professionally
2. Ask how you can help them today
3. Collect caller's name and contact information
4. Determine the nature of their inquiry (appointment, quote, general question, etc.)
5. For appointments: Ask for preferred date/time and any special requirements
6. For quotes: Collect project details, location, and preferred callback time
7. For general questions: Answer based on the following information:
   - Hours: [Business Hours]
   - Services: [List of Services]
   - Pricing: Starting from [Price]
8. Always offer to transfer to a human if the caller prefers
9. Thank the caller for calling and provide next steps
10. Remain calm and helpful throughout the conversation`,
  },
  {
    id: 'electrician',
    name: 'Electrician Service',
    industry: 'Electrical',
    template: `You are a professional service coordinator for [Electrical Company]. Your role is to:

1. Greet callers: "Thank you for calling [Company Name], how can I help you today?"
2. Identify the type of electrical issue:
   - Emergency (sparks, fire hazard, power outage)
   - Installation/upgrade (outlets, switches, panel)
   - Repair (faulty wiring, broken fixtures)
   - Inspection or consultation
3. For EMERGENCIES: 
   - Assure immediate attention
   - Collect address and contact details
   - Dispatch technician immediately
4. For non-emergencies:
   - Collect name, phone, and address
   - Get detailed description of the work needed
   - Ask about preferred appointment time
   - Provide estimate range if known
5. Always mention:
   - Fully licensed and insured
   - 24/7 emergency service available
   - Free estimates for major projects
6. Confirm callback preference if you can't schedule immediately
7. Thank them and provide approximate response time`,
  },
  {
    id: 'plumber',
    name: 'Plumbing Service',
    industry: 'Plumbing',
    template: `You are a professional scheduler for [Plumbing Company]. Your role is to:

1. Greet callers: "Thanks for calling [Company Name], this is [Your Name], how may I assist you?"
2. Categorize the plumbing issue:
   - Emergency (burst pipe, flooding, no water)
   - Urgent (clogged drain, leaking fixture)
   - Routine (maintenance, installation, repair)
3. For EMERGENCIES:
   - Confirm address and best callback number
   - Dispatch technician ASAP
   - Provide expected arrival time
4. For URGENT/ROUTINE:
   - Collect full name and contact info
   - Get property address and detailed issue description
   - Ask: "Is this a residential or commercial property?"
   - Schedule appointment:
     * Morning (8am-12pm) or Afternoon (12pm-5pm)?
     * Any time restrictions?
5. Mention our services:
   - Emergency service 24/7
   - Licensed, bonded, and insured
   - Upfront pricing, no hidden fees
   - Satisfaction guaranteed
6. Confirm appointment details and ask about access to the property
7. Thank them for their business`,
  },
  {
    id: 'beauty',
    name: 'Beauty Salon/Spa',
    industry: 'Beauty',
    template: `You are a friendly booking coordinator for [Salon/Spa Name]. Your role is to:

1. Greet callers warmly: "Welcome to [Salon Name]! How can I help you today?"
2. Identify the service needed:
   - Haircut/styling
   - Coloring/treatment
   - Nails (manicure/pedicure)
   - Facial/skincare
   - Massage/body treatment
   - Waxing
   - Package/combination
3. Collect client information:
   - Full name (first visit? ask for email/phone)
   - Preferred date and time
   - Any special requests or allergies
4. For new clients:
   - Briefly mention our services and specialties
   - Ask if they'd like to book a consultation
5. Confirm booking details:
   - Date and time
   - Service(s)
   - Stylist preference (if applicable)
   - Price estimate
6. Mention policies:
   - 24-hour cancellation notice appreciated
   - Payment options
   - Late arrival policy
7. Ask: "Can I help you with anything else today?"
8. Close warmly: "We look forward to seeing you [Day]!"`,
  },
];

export default function ScriptsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<ScriptTemplate | null>(null);
  const [script, setScript] = useState('');
  const [scriptName, setScriptName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLoadTemplate = (template: ScriptTemplate) => {
    setSelectedTemplate(template);
    setScript(template.template);
    setScriptName(template.name);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script);
    alert('Script copied to clipboard!');
  };

  const handleSaveScript = async () => {
    if (!scriptName || !script) return;

    setSaving(true);
    try {
      // This would save to the selected agent
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Script saved successfully!');
      setScriptName('');
      setScript('');
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error saving script:', error);
      alert('Failed to save script');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Agent Scripts</h1>
        <p className="text-muted-foreground">Manage and customize agent conversation scripts</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Templates */}
        <div className="lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Script Templates</h2>
          <div className="space-y-3">
            {scriptTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleLoadTemplate(template)}
                className="w-full rounded-lg border bg-card p-4 text-left transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">{template.industry}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Script Editor */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {selectedTemplate ? 'Editing: ' + selectedTemplate.name : 'Custom Script'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyScript}
                  disabled={!script}
                  className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  <Copy className="mr-2 h-4 w-4 inline" />
                  Copy
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="scriptName" className="block text-sm font-medium mb-2">
                Script Name
              </label>
              <input
                id="scriptName"
                type="text"
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter a name for this script"
              />
            </div>

            <div>
              <label htmlFor="script" className="block text-sm font-medium mb-2">
                Script Content
              </label>
              <textarea
                id="script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={20}
                className="w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your agent script here..."
              />
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveScript}
                disabled={saving || !scriptName || !script}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Script'}
              </Button>
            </div>

            <div className="mt-6 rounded-lg bg-muted/50 p-4">
              <h3 className="mb-2 font-semibold">Script Guidelines</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Use clear, concise language</li>
                <li>• Include fallback options for different scenarios</li>
                <li>• Add placeholders like [Business Name] for easy customization</li>
                <li>• Include escalation procedures for complex issues</li>
                <li>• Keep the script under 2000 characters for best performance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
