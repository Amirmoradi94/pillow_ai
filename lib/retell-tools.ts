// Complete Retell AI General Tools Library
// Based on: https://docs.retellai.com/api-references/create-retell-llm

export interface RetellTool {
  type: string;
  name: string;
  description: string;
  [key: string]: any;
}

// 1. END CALL - Terminate conversation
export const endCallTool = (): RetellTool => ({
  type: 'end_call',
  name: 'end_conversation',
  description: 'End the call when the user\'s request is fully handled or they ask to hang up',
});

// 2. TRANSFER CALL - Transfer to phone number or agent
export const transferCallTool = (config: {
  name: string;
  description: string;
  transferTo: string; // Phone number or agent ID
  transferType?: 'phone' | 'agent';
}): RetellTool => ({
  type: 'transfer_call',
  name: config.name,
  description: config.description,
  transfer_destination: config.transferTo,
  transfer_option: config.transferType || 'phone',
});

// 3. CHECK AVAILABILITY - Custom Calendar System
export const checkCalendarAvailabilityTool = (config: {
  name: string;
  description: string;
  apiUrl: string;
  agentId: string;
}): RetellTool => ({
  type: 'custom',
  name: config.name || 'check_availability',
  description: config.description || 'Check available appointment time slots',
  url: `${config.apiUrl}/api/calendar/availability/retell`,
  method: 'POST',
  parameters: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'Date to check (YYYY-MM-DD format)',
      },
      duration: {
        type: 'number',
        description: 'Duration in minutes (default 30)',
      },
      timezone: {
        type: 'string',
        description: 'Timezone (e.g., America/Los_Angeles, default UTC)',
      },
    },
    required: ['date'],
  },
  headers: {
    'X-Agent-ID': config.agentId,
    'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
  },
  speak_during_execution: true,
  execution_message_description: 'Checking available time slots...',
});

// 4. BOOK APPOINTMENT - Custom Calendar System
export const bookCalendarAppointmentTool = (config: {
  name: string;
  description: string;
  apiUrl: string;
  agentId: string;
}): RetellTool => ({
  type: 'custom',
  name: config.name || 'book_appointment',
  description: config.description || 'Book an appointment for the customer',
  url: `${config.apiUrl}/api/calendar/booking/retell`,
  method: 'POST',
  parameters: {
    type: 'object',
    properties: {
      date_time: {
        type: 'string',
        description: 'Appointment date and time (ISO 8601 format)',
      },
      duration: {
        type: 'number',
        description: 'Duration in minutes (default 30)',
      },
      customer_name: {
        type: 'string',
        description: 'Customer full name',
      },
      customer_phone: {
        type: 'string',
        description: 'Customer phone number',
      },
      customer_email: {
        type: 'string',
        description: 'Customer email address (optional)',
      },
      notes: {
        type: 'string',
        description: 'Additional notes or special requests',
      },
      timezone: {
        type: 'string',
        description: 'Timezone (e.g., America/Los_Angeles, default UTC)',
      },
    },
    required: ['date_time', 'customer_name', 'customer_phone'],
  },
  headers: {
    'X-Agent-ID': config.agentId,
    'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
  },
  speak_during_execution: true,
  execution_message_description: 'Booking your appointment...',
});

// Legacy Cal.com tools (deprecated - use custom calendar tools above)
export const checkAvailabilityTool = (config: {
  name: string;
  description: string;
  calApiKey: string;
  eventTypeId: number;
  timezone?: string;
}): RetellTool => ({
  type: 'check_availability_cal',
  name: config.name,
  description: config.description,
  cal_api_key: config.calApiKey,
  event_type_id: config.eventTypeId,
  timezone: config.timezone || 'America/Los_Angeles',
});

export const bookAppointmentTool = (config: {
  name: string;
  description: string;
  calApiKey: string;
  eventTypeId: number;
  timezone?: string;
}): RetellTool => ({
  type: 'book_appointment_cal',
  name: config.name,
  description: config.description,
  cal_api_key: config.calApiKey,
  event_type_id: config.eventTypeId,
  timezone: config.timezone || 'America/Los_Angeles',
});

// 5. AGENT SWAP - Switch to different agent
export const agentSwapTool = (config: {
  name: string;
  description: string;
  targetAgentId: string;
}): RetellTool => ({
  type: 'agent_swap',
  name: config.name,
  description: config.description,
  agent_id: config.targetAgentId,
});

// 6. PRESS DIGIT - Send DTMF tones for IVR
export const pressDigitTool = (config: {
  name: string;
  description: string;
}): RetellTool => ({
  type: 'press_digit',
  name: config.name,
  description: config.description,
});

// 7. SEND SMS - Send text message
export const sendSmsTool = (config: {
  name: string;
  description: string;
  message?: string; // Optional static message
}): RetellTool => ({
  type: 'send_sms',
  name: config.name,
  description: config.description,
  ...(config.message && { sms_content: config.message }),
});

// 8. CUSTOM TOOL - External API integration
export const customTool = (config: {
  name: string;
  description: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  parameters?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  headers?: Record<string, string>;
  responseVariables?: Record<string, string>;
  speakAfterExecution?: boolean;
  executionMessageDescription?: string;
}): RetellTool => ({
  type: 'custom',
  name: config.name,
  description: config.description,
  url: config.url,
  method: config.method,
  ...(config.parameters && { parameters: config.parameters }),
  ...(config.headers && { headers: config.headers }),
  ...(config.responseVariables && { response_variables: config.responseVariables }),
  speak_during_execution: config.speakAfterExecution || true,
  ...(config.executionMessageDescription && {
    execution_message_description: config.executionMessageDescription,
  }),
});

// 9. EXTRACT DYNAMIC VARIABLE - Capture conversation data
export const extractDynamicVariableTool = (config: {
  name: string;
  description: string;
  variableName: string;
}): RetellTool => ({
  type: 'extract_dynamic_variable',
  name: config.name,
  description: config.description,
  variable_name: config.variableName,
});

// 10. BRIDGE TRANSFER - Connect caller with transfer target
export const bridgeTransferTool = (config: {
  name: string;
  description: string;
  transferTo: string;
}): RetellTool => ({
  type: 'bridge_transfer',
  name: config.name,
  description: config.description,
  transfer_destination: config.transferTo,
});

// 11. CANCEL TRANSFER - Halt transfer and return to agent
export const cancelTransferTool = (): RetellTool => ({
  type: 'cancel_transfer',
  name: 'cancel_ongoing_transfer',
  description: 'Cancel the current transfer and return the caller to the agent',
});

// 12. MCP - Model Context Protocol integration
export const mcpTool = (config: {
  name: string;
  description: string;
  serverName: string;
  toolName: string;
}): RetellTool => ({
  type: 'mcp',
  name: config.name,
  description: config.description,
  server_name: config.serverName,
  tool_name: config.toolName,
});

// Helper: Create common webhook tool
export const webhookTool = (config: {
  name: string;
  description: string;
  webhookUrl: string;
  parameters?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}): RetellTool => customTool({
  name: config.name,
  description: config.description,
  url: config.webhookUrl,
  method: 'POST',
  parameters: config.parameters,
  speakAfterExecution: true,
});

// Helper: Create CRM integration tool
export const crmSaveLeadTool = (webhookUrl: string): RetellTool => webhookTool({
  name: 'save_lead_to_crm',
  description: 'Save lead information to CRM system',
  webhookUrl,
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Lead full name' },
      phone: { type: 'string', description: 'Phone number' },
      email: { type: 'string', description: 'Email address' },
      notes: { type: 'string', description: 'Additional notes or requirements' },
    },
    required: ['name', 'phone'],
  },
});

// Helper: Check order status tool
export const checkOrderStatusTool = (apiUrl: string, apiKey?: string): RetellTool => customTool({
  name: 'check_order_status',
  description: 'Check the status of a customer order',
  url: apiUrl,
  method: 'GET',
  parameters: {
    type: 'object',
    properties: {
      order_id: { type: 'string', description: 'Order ID or tracking number' },
    },
    required: ['order_id'],
  },
  ...(apiKey && {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  }),
  responseVariables: {
    status: 'data.status',
    tracking_number: 'data.tracking',
    estimated_delivery: 'data.estimated_delivery',
  },
});

// Helper: Emergency transfer tool
export const emergencyTransferTool = (emergencyPhone: string): RetellTool => transferCallTool({
  name: 'transfer_to_emergency',
  description: 'Transfer to emergency line for urgent situations',
  transferTo: emergencyPhone,
  transferType: 'phone',
});

// Helper: Send appointment confirmation SMS
export const appointmentConfirmationSms = (): RetellTool => sendSmsTool({
  name: 'send_appointment_confirmation',
  description: 'Send SMS confirmation with appointment details',
  message: 'Your appointment has been confirmed. We look forward to seeing you!',
});

// Export all tools for easy access
export const RetellTools = {
  endCall: endCallTool,
  transferCall: transferCallTool,
  // New custom calendar tools (preferred)
  checkCalendarAvailability: checkCalendarAvailabilityTool,
  bookCalendarAppointment: bookCalendarAppointmentTool,
  // Legacy Cal.com tools (deprecated)
  checkAvailability: checkAvailabilityTool,
  bookAppointment: bookAppointmentTool,
  agentSwap: agentSwapTool,
  pressDigit: pressDigitTool,
  sendSms: sendSmsTool,
  custom: customTool,
  extractVariable: extractDynamicVariableTool,
  bridgeTransfer: bridgeTransferTool,
  cancelTransfer: cancelTransferTool,
  mcp: mcpTool,
  webhook: webhookTool,
  crmSaveLead: crmSaveLeadTool,
  checkOrderStatus: checkOrderStatusTool,
  emergencyTransfer: emergencyTransferTool,
  appointmentConfirmationSms: appointmentConfirmationSms,
};
