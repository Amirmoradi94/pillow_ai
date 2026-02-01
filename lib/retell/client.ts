import Retell from 'retell-sdk';

const client = new Retell({
  apiKey: process.env.RETELL_API_KEY || '',
});

export { client as retellClient };

// Agent management functions
export async function createRetellAgent(config: {
  name: string;
  script: string;
  voice_model?: string;
  language?: string;
  response_speed?: 'fast' | 'medium' | 'slow';
  knowledge_base_ids?: string[];
  tools?: any[];
}) {
  try {
    // Step 1: Create Retell LLM with the script
    // https://docs.retellai.com/api-references/create-retell-llm
    const llmConfig: any = {
      general_prompt: config.script,
      model: 'gpt-4o',
    };

    // Add knowledge bases if provided
    if (config.knowledge_base_ids && config.knowledge_base_ids.length > 0) {
      llmConfig.knowledge_base_ids = config.knowledge_base_ids;
    }

    // Add tools if provided
    if (config.tools && config.tools.length > 0) {
      llmConfig.general_tools = config.tools;
    }

    // @ts-ignore
    const llm = await client.llm.create(llmConfig);

    // Step 2: Create agent with the LLM ID
    // https://docs.retellai.com/api-references/create-agent
    // @ts-ignore
    const agent = await client.agent.create({
      agent_name: config.name,
      voice_id: config.voice_model || '11labs-Adrian',
      language: config.language || 'en-US',
      response_engine: {
        type: 'retell-llm',
        llm_id: llm.llm_id,
      },
      // Optional settings
      responsiveness: config.response_speed === 'fast' ? 0.8 : config.response_speed === 'slow' ? 0.3 : 0.5,
      interruption_sensitivity: 0.5,
      enable_backchannel: true,
      backchannel_frequency: 0.3,
    });

    // Return agent with llm_id
    return {
      data: {
        ...agent,
        llm_id: llm.llm_id,
      },
      error: null,
    };
  } catch (error: any) {
    console.error('Error creating Retell agent:', error);
    const errorMessage = error?.error?.error_message || error?.message || 'Failed to create agent';
    return { data: null, error: errorMessage };
  }
}

export async function updateRetellAgent(
  agentId: string,
  config: {
    name?: string;
    script?: string;
    voice_model?: string;
    language?: string;
    response_speed?: 'fast' | 'medium' | 'slow';
  },
  llmId?: string
) {
  try {
    // If script is provided and we have llmId, update the LLM first
    if (config.script && llmId) {
      // @ts-ignore
      await client.llm.update(llmId, {
        general_prompt: config.script,
      });
    }

    // Update agent settings
    // https://docs.retellai.com/api-references/update-agent
    const updateData: any = {};

    if (config.name) updateData.agent_name = config.name;
    if (config.voice_model) updateData.voice_id = config.voice_model;
    if (config.language) updateData.language = config.language;
    if (config.response_speed) {
      updateData.responsiveness = config.response_speed === 'fast' ? 0.8 : config.response_speed === 'slow' ? 0.3 : 0.5;
    }

    // @ts-ignore
    const agent = await client.agent.update(agentId, updateData);

    return { data: agent, error: null };
  } catch (error) {
    console.error('Error updating Retell agent:', error);
    return { data: null, error: 'Failed to update agent' };
  }
}

export async function deleteRetellAgent(agentId: string) {
  try {
    // @ts-ignore - Retell SDK type definitions may vary
    await client.agent.delete(agentId);
    return { error: null };
  } catch (error) {
    console.error('Error deleting Retell agent:', error);
    return { error: 'Failed to delete agent' };
  }
}

export async function getRetellAgent(agentId: string) {
  try {
    // @ts-ignore - Retell SDK type definitions may vary
    const agent = await client.agent.retrieve(agentId);
    return { data: agent, error: null };
  } catch (error) {
    console.error('Error fetching Retell agent:', error);
    return { data: null, error: 'Failed to fetch agent' };
  }
}

export async function listRetellAgents() {
  try {
    // @ts-ignore - Retell SDK type definitions may vary
    const agents = await client.agent.list();
    return { data: agents, error: null };
  } catch (error) {
    console.error('Error listing Retell agents:', error);
    return { data: null, error: 'Failed to list agents' };
  }
}

// Phone number management functions
// Based on https://docs.retellai.com/api-references/create-phone-number
export async function createPhoneNumber(config: {
  areaCode: number;
  inboundAgentId?: string;
  outboundAgentId?: string;
  nickname?: string;
  countryCode?: 'US' | 'CA';
  tollFree?: boolean;
  numberProvider?: 'twilio' | 'telnyx';
}) {
  try {
    // @ts-ignore - Retell SDK type definitions may vary
    const phoneNumber = await client.phoneNumber.create({
      area_code: config.areaCode,
      inbound_agent_id: config.inboundAgentId || null,
      outbound_agent_id: config.outboundAgentId || null,
      nickname: config.nickname,
      country_code: config.countryCode || 'US',
      toll_free: config.tollFree || false,
      number_provider: config.numberProvider || 'twilio',
    });

    return { data: phoneNumber, error: null };
  } catch (error: any) {
    console.error('Error creating phone number:', error);
    const errorMessage = error?.error?.error_message || error?.message || 'Failed to create phone number';
    return { data: null, error: errorMessage };
  }
}

// Based on https://docs.retellai.com/api-references/update-phone-number
export async function updatePhoneNumber(phoneNumber: string, config: {
  inboundAgentId?: string | null;
  outboundAgentId?: string | null;
  nickname?: string;
  inboundWebhookUrl?: string;
}) {
  try {
    // @ts-ignore - Retell SDK type definitions may vary
    const result = await client.phoneNumber.update(phoneNumber, {
      inbound_agent_id: config.inboundAgentId,
      outbound_agent_id: config.outboundAgentId,
      nickname: config.nickname,
      inbound_webhook_url: config.inboundWebhookUrl,
    });

    return { data: result, error: null };
  } catch (error: any) {
    console.error('Error updating phone number:', error);
    const errorMessage = error?.error?.error_message || error?.message || 'Failed to update phone number';
    return { data: null, error: errorMessage };
  }
}

// Based on https://docs.retellai.com/api-references/list-phone-numbers
export async function listPhoneNumbers() {
  try {
    // @ts-ignore - Retell SDK type definitions may vary
    const phoneNumbers = await client.phoneNumber.list();
    return { data: phoneNumbers, error: null };
  } catch (error: any) {
    console.error('Error listing phone numbers:', error);
    const errorMessage = error?.error?.error_message || error?.message || 'Failed to list phone numbers';
    return { data: null, error: errorMessage };
  }
}

// Based on https://docs.retellai.com/api-references/get-phone-number
export async function getPhoneNumber(phoneNumber: string) {
  try {
    // @ts-ignore - Retell SDK type definitions may vary
    const result = await client.phoneNumber.retrieve(phoneNumber);
    return { data: result, error: null };
  } catch (error: any) {
    console.error('Error getting phone number:', error);
    const errorMessage = error?.error?.error_message || error?.message || 'Failed to get phone number';
    return { data: null, error: errorMessage };
  }
}

// Based on https://docs.retellai.com/api-references/delete-phone-number
export async function deletePhoneNumber(phoneNumber: string) {
  try {
    // @ts-ignore - Retell SDK type definitions may vary
    await client.phoneNumber.delete(phoneNumber);
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting phone number:', error);
    const errorMessage = error?.error?.error_message || error?.message || 'Failed to delete phone number';
    return { error: errorMessage };
  }
}

// Backwards compatibility helper
export async function assignPhoneNumberToAgent(phoneNumber: string, agentId: string) {
  return updatePhoneNumber(phoneNumber, {
    inboundAgentId: agentId,
    outboundAgentId: agentId,
  });
}

// Call management functions
export async function createCall(agentId: string, phoneNumber: string) {
  try {
    // @ts-ignore - Retell SDK type definitions may vary
    const call = await client.call.create({
      agent_id: agentId,
      to_number: phoneNumber,
    });

    return { data: call, error: null };
  } catch (error) {
    console.error('Error creating call:', error);
    return { data: null, error: 'Failed to create call' };
  }
}

export async function listCalls() {
  try {
    // @ts-ignore - Retell SDK type definitions may vary
    const calls = await client.call.list();
    return { data: calls, error: null };
  } catch (error) {
    console.error('Error listing calls:', error);
    return { data: null, error: 'Failed to list calls' };
  }
}
