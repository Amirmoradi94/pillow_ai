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
  voice_emotion?: 'calm' | 'sympathetic' | 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | '';
  interruption_sensitivity?: number;
  enable_backchannel?: boolean;
  backchannel_frequency?: number;
  backchannel_words?: string[];
  end_call_after_silence_ms?: number;
  knowledge_base_ids?: string[];
  tools?: any[];
  ambient_sound?: string;
  ambient_sound_volume?: number;
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
    const agentConfig: any = {
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
    };

    // Add background sound if provided
    if (config.ambient_sound) {
      agentConfig.ambient_sound = config.ambient_sound;
    }
    if (config.ambient_sound_volume !== undefined) {
      agentConfig.ambient_sound_volume = config.ambient_sound_volume;
    }
    if (config.voice_emotion !== undefined) {
      agentConfig.voice_emotion = config.voice_emotion || null;
    }
    if (config.interruption_sensitivity !== undefined) {
      agentConfig.interruption_sensitivity = config.interruption_sensitivity;
    }
    if (config.enable_backchannel !== undefined) {
      agentConfig.enable_backchannel = config.enable_backchannel;
    }
    if (config.backchannel_frequency !== undefined) {
      agentConfig.backchannel_frequency = config.backchannel_frequency;
    }
    if (config.backchannel_words !== undefined) {
      agentConfig.backchannel_words = config.backchannel_words;
    }
    if (config.end_call_after_silence_ms !== undefined) {
      agentConfig.end_call_after_silence_ms = config.end_call_after_silence_ms;
    }

    const defaultVoiceId = '11labs-Adrian';
    let agent: any;
    try {
      // @ts-ignore
      agent = await client.agent.create(agentConfig);
    } catch (createError: any) {
      const createErrorMessage =
        createError?.error?.error_message ||
        createError?.message ||
        '';
      const isVoiceNotFound =
        createErrorMessage.includes('Item') &&
        createErrorMessage.includes('not found') &&
        createErrorMessage.includes('voice');

      if (!isVoiceNotFound || agentConfig.voice_id === defaultVoiceId) {
        throw createError;
      }

      // Retry once with a known-safe default voice when selected voice is missing.
      // This prevents agent creation failures from stale template voice ids.
      console.warn(
        `Voice ${agentConfig.voice_id} not found. Retrying with fallback ${defaultVoiceId}.`
      );
      agentConfig.voice_id = defaultVoiceId;
      // @ts-ignore
      agent = await client.agent.create(agentConfig);
    }

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
    tools?: any[];
    voice_model?: string;
    language?: string;
    response_speed?: 'fast' | 'medium' | 'slow';
    voice_emotion?: 'calm' | 'sympathetic' | 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | '';
    interruption_sensitivity?: number;
    enable_backchannel?: boolean;
    backchannel_frequency?: number;
    backchannel_words?: string[];
    end_call_after_silence_ms?: number;
    ambient_sound?: string;
    ambient_sound_volume?: number;
  },
  llmId?: string
) {
  try {
    // If script/tools are provided and we have llmId, update the LLM first
    if (llmId && (config.script !== undefined || config.tools !== undefined)) {
      const llmUpdatePayload: any = {};
      if (config.script !== undefined) {
        llmUpdatePayload.general_prompt = config.script;
      }
      if (config.tools !== undefined) {
        llmUpdatePayload.general_tools = config.tools;
      }

      // @ts-ignore
      await client.llm.update(llmId, llmUpdatePayload);
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
    if (config.voice_emotion !== undefined) {
      updateData.voice_emotion = config.voice_emotion || null;
    }
    if (config.interruption_sensitivity !== undefined) {
      updateData.interruption_sensitivity = config.interruption_sensitivity;
    }
    if (config.enable_backchannel !== undefined) {
      updateData.enable_backchannel = config.enable_backchannel;
    }
    if (config.backchannel_frequency !== undefined) {
      updateData.backchannel_frequency = config.backchannel_frequency;
    }
    if (config.backchannel_words !== undefined) {
      updateData.backchannel_words = config.backchannel_words;
    }
    if (config.end_call_after_silence_ms !== undefined) {
      updateData.end_call_after_silence_ms = config.end_call_after_silence_ms;
    }
    if (config.ambient_sound !== undefined) {
      updateData.ambient_sound = config.ambient_sound || null;
    }
    if (config.ambient_sound_volume !== undefined) {
      updateData.ambient_sound_volume = config.ambient_sound_volume;
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

export async function createRetellPhoneCall(config: {
  fromNumber: string;
  toNumber: string;
  overrideAgentId: string;
  retellLlmDynamicVariables?: Record<string, string>;
  metadata?: Record<string, any>;
}) {
  try {
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      return { data: null, error: 'Missing RETELL_API_KEY' };
    }

    const response = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_number: config.fromNumber,
        to_number: config.toNumber,
        override_agent_id: config.overrideAgentId,
        retell_llm_dynamic_variables: config.retellLlmDynamicVariables || {},
        metadata: config.metadata || {},
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage =
        payload?.error?.error_message ||
        payload?.error ||
        payload?.message ||
        `Retell create-phone-call failed (${response.status})`;
      return { data: null, error: errorMessage };
    }

    return { data: payload, error: null };
  } catch (error: any) {
    console.error('Error creating Retell phone call:', error);
    return { data: null, error: error?.message || 'Failed to create phone call' };
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

// Based on https://docs.retellai.com/api-references/import-phone-number
export async function importPhoneNumber(config: {
  phoneNumber: string;
  terminationUri: string;
  sipTrunkAuthUsername?: string;
  sipTrunkAuthPassword?: string;
  inboundAgentId?: string | null;
  outboundAgentId?: string | null;
  nickname?: string;
  inboundWebhookUrl?: string;
  allowedInboundCountryList?: string[];
  allowedOutboundCountryList?: string[];
}) {
  try {
    // @ts-ignore - Retell SDK type definitions may vary
    const phoneNumber = await client.phoneNumber.import({
      phone_number: config.phoneNumber,
      termination_uri: config.terminationUri,
      sip_trunk_auth_username: config.sipTrunkAuthUsername,
      sip_trunk_auth_password: config.sipTrunkAuthPassword,
      inbound_agent_id: config.inboundAgentId,
      outbound_agent_id: config.outboundAgentId,
      nickname: config.nickname,
      inbound_webhook_url: config.inboundWebhookUrl,
      allowed_inbound_country_list: config.allowedInboundCountryList,
      allowed_outbound_country_list: config.allowedOutboundCountryList,
    });

    return { data: phoneNumber, error: null };
  } catch (error: any) {
    console.error('Error importing phone number:', error);
    const errorMessage = error?.error?.error_message || error?.message || 'Failed to import phone number';
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
