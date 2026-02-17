'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Plus, X, Settings, Phone, Zap, PhoneCall, PhoneOff, Mic, MicOff, Volume2, Play, Pause, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BACKGROUND_SOUNDS, DEFAULT_BACKGROUND_SOUND, DEFAULT_BACKGROUND_SOUND_VOLUME, type BackgroundSound } from '@/lib/background-sounds';

interface Voice {
  voice_id: string;
  voice_name: string;
  provider: string;
  gender: string;
  accent?: string;
  age?: string;
  preview_audio_url?: string;
}

interface CalendarProvider {
  id: string;
  provider: string;
  provider_email?: string | null;
  status: string;
}

interface Agent {
  id: string;
  name: string;
  script: string;
  settings: {
    voice_model: string;
    language: string;
    response_speed: string;
    voice_emotion?: string;
    interruption_sensitivity?: number;
    enable_backchannel?: boolean;
    backchannel_frequency?: number;
    backchannel_words?: string[];
    end_call_after_silence_ms?: number;
    template_id?: string;
    knowledge_base_ids?: string[];
    tools?: any[];
    calendar_provider_id?: string;
    salesAgentConfig?: any;
  };
  retell_agent_id: string;
  retell_llm_id: string;
  status: string;
}

interface ToolConfig {
  type: string;
  name: string;
  description: string;
  enabled: boolean;
  config?: any;
}

const hasToolEnabled = (tools: any[], toolType: string): boolean => {
  if (!Array.isArray(tools)) return false;

  return tools.some((tool: any) => {
    const type = tool?.type;
    const name = tool?.name;
    const url = tool?.url;

    switch (toolType) {
      case 'end_call':
        return type === 'end_call';
      case 'book_appointment':
        return (
          type === 'book_appointment_cal' ||
          (type === 'custom' &&
            (name === 'book_appointment' ||
              (typeof url === 'string' && url.includes('/api/calendar/booking/retell'))))
        );
      case 'check_availability':
        return (
          type === 'check_availability_cal' ||
          (type === 'custom' &&
            (name === 'check_availability' ||
              (typeof url === 'string' && url.includes('/api/calendar/availability/retell'))))
        );
      case 'send_sms':
        return type === 'send_sms';
      case 'transfer_call':
        return type === 'transfer_call' || type === 'bridge_transfer';
      default:
        return type === toolType;
    }
  });
};

export default function AgentEditPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [script, setScript] = useState('');
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [voiceModel, setVoiceModel] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [responseSpeed, setResponseSpeed] = useState('medium');
  const [voiceEmotion, setVoiceEmotion] = useState('');
  const [interruptionSensitivity, setInterruptionSensitivity] = useState(0.5);
  const [enableBackchannel, setEnableBackchannel] = useState(true);
  const [backchannelFrequency, setBackchannelFrequency] = useState(0.8);
  const [backchannelWordsInput, setBackchannelWordsInput] = useState('yeah, uh-huh, okay');
  const [endCallAfterSilenceSeconds, setEndCallAfterSilenceSeconds] = useState('600');

  // Voice selection
  const [voices, setVoices] = useState<Voice[]>([]);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<string>('elevenlabs');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [accentFilter, setAccentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Tool management
  const [activeTab, setActiveTab] = useState<'config' | 'tools' | 'test'>('config');
  const [transferPhone, setTransferPhone] = useState('');

  // Background sound states
  const [backgroundSound, setBackgroundSound] = useState<BackgroundSound>(DEFAULT_BACKGROUND_SOUND);
  const [backgroundSoundVolume, setBackgroundSoundVolume] = useState(DEFAULT_BACKGROUND_SOUND_VOLUME);

  // Phone number states
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [loadingPhoneNumbers, setLoadingPhoneNumbers] = useState(false);
  const [purchasingPhone, setPurchasingPhone] = useState(false);
  const [newPhoneAreaCode, setNewPhoneAreaCode] = useState<string>('');
  const [newPhoneNickname, setNewPhoneNickname] = useState<string>('');
  const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({});
  const [calendarProviders, setCalendarProviders] = useState<CalendarProvider[]>([]);
  const [selectedCalendarProviderId, setSelectedCalendarProviderId] = useState<string>('');
  const [salesAgentConfig, setSalesAgentConfig] = useState<any | null>(null);
  const [salesCsvUploading, setSalesCsvUploading] = useState(false);
  const [salesCsvError, setSalesCsvError] = useState('');

  // Web call testing
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callTranscript, setCallTranscript] = useState<string[]>([]);
  const [callStatus, setCallStatus] = useState<string>('');
  const retellWebClientRef = useRef<any>(null);
  const liveTranscriptRef = useRef<Map<string, string>>(new Map());
  const committedTranscriptRef = useRef<Map<string, string>>(new Map());

  // Available tools
  const [availableTools, setAvailableTools] = useState<ToolConfig[]>([
    {
      type: 'end_call',
      name: 'End Call',
      description: 'End the conversation gracefully',
      enabled: true,
    },
    {
      type: 'book_appointment',
      name: 'Book Appointment',
      description: 'Book appointments via integrated calendar system',
      enabled: false,
    },
    {
      type: 'check_availability',
      name: 'Check Availability',
      description: 'Check available appointment slots from integrated calendar',
      enabled: false,
    },
    {
      type: 'send_sms',
      name: 'Send SMS',
      description: 'Send SMS confirmations',
      enabled: false,
    },
    {
      type: 'transfer_call',
      name: 'Transfer Call',
      description: 'Transfer to staff member',
      enabled: false,
      config: { requiresPhone: true },
    },
  ]);
  const hasSalesWebhookTools = Array.isArray(agent?.settings?.tools)
    ? agent!.settings.tools.some((tool: any) =>
        ['log_call_outcome', 'schedule_callback', 'send_follow_up_email'].includes(tool?.name)
      )
    : false;
  const isOutboundSalesAgent =
    agent?.settings?.template_id === 'sales-agent-outbound' ||
    Boolean(agent?.settings?.salesAgentConfig) ||
    Boolean(salesAgentConfig) ||
    hasSalesWebhookTools ||
    (agent?.name || '').toLowerCase().includes('sales agent');

  useEffect(() => {
    fetchAgent();
    fetchCalendarProviders();
  }, [agentId]);

  // Fetch voices when modal opens
  useEffect(() => {
    if (showVoiceModal && voices.length === 0) {
      fetchVoices();
    }
  }, [showVoiceModal]);

  // Fetch phone numbers when modal opens
  useEffect(() => {
    if (showPhoneModal && phoneNumbers.length === 0) {
      fetchPhoneNumbers();
    }
  }, [showPhoneModal]);

  const fetchPhoneNumbers = async () => {
    setLoadingPhoneNumbers(true);
    try {
      const response = await fetch('/api/phone-numbers');
      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data.phoneNumbers || []);

        // Find the phone number bound to this agent
        if (agent?.retell_agent_id) {
          const boundPhone = data.phoneNumbers?.find(
            (phone: any) =>
              phone.inbound_agent_id === agent.retell_agent_id ||
              phone.outbound_agent_id === agent.retell_agent_id
          );
          if (boundPhone && !selectedPhoneNumber) {
            setSelectedPhoneNumber(boundPhone.phone_number);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    } finally {
      setLoadingPhoneNumbers(false);
    }
  };

  const handlePurchasePhone = async () => {
    if (!newPhoneAreaCode || newPhoneAreaCode.length !== 3) {
      setError('Please enter a valid 3-digit area code');
      return;
    }

    setPurchasingPhone(true);
    setError('');

    try {
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaCode: newPhoneAreaCode,
          nickname: newPhoneNickname || `Phone (${newPhoneAreaCode})`,
          inboundAgentId: agent?.retell_agent_id,
          outboundAgentId: agent?.retell_agent_id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to purchase phone number');
      }

      const data = await response.json();
      setSelectedPhoneNumber(data.phoneNumber.phone_number);
      setNewPhoneAreaCode('');
      setNewPhoneNickname('');
      await fetchPhoneNumbers();
      setShowPhoneModal(false);
      setSuccess('Phone number purchased and assigned successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPurchasingPhone(false);
    }
  };

  const fetchVoices = async () => {
    setLoadingVoices(true);
    try {
      const response = await fetch('/api/voices');
      if (response.ok) {
        const data = await response.json();
        setVoices(data);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  const fetchCalendarProviders = async () => {
    try {
      const response = await fetch('/api/calendar/providers');
      if (!response.ok) return;
      const data = await response.json();
      setCalendarProviders(data.providers || []);
    } catch (error) {
      console.error('Error fetching calendar providers:', error);
    }
  };

  const fetchAgent = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      if (!response.ok) throw new Error('Failed to fetch agent');

      const data = await response.json();
      const agentData = data.agent;

      setAgent(agentData);
      setName(agentData.name);
      setScript(agentData.script);
      setSelectedCalendarProviderId(agentData.settings?.calendar_provider_id || '');
      const voiceModelValue = agentData.settings?.voice_model || '';
      setVoiceModel(voiceModelValue);
      setVoiceName(voiceModelValue.split('-')[1] || voiceModelValue);
      setLanguage(agentData.settings?.language || 'en-US');
      setResponseSpeed(agentData.settings?.response_speed || 'medium');
      setVoiceEmotion(agentData.settings?.voice_emotion || '');
      setInterruptionSensitivity(agentData.settings?.interruption_sensitivity ?? 0.5);
      setEnableBackchannel(agentData.settings?.enable_backchannel ?? true);
      setBackchannelFrequency(agentData.settings?.backchannel_frequency ?? 0.8);
      setBackchannelWordsInput(Array.isArray(agentData.settings?.backchannel_words)
        ? agentData.settings.backchannel_words.join(', ')
        : 'yeah, uh-huh, okay');
      setEndCallAfterSilenceSeconds(
        String(Math.round((agentData.settings?.end_call_after_silence_ms ?? 600000) / 1000))
      );

      // Load background sound settings
      const ambientSound = agentData.settings?.ambient_sound;
      setBackgroundSound(ambientSound || DEFAULT_BACKGROUND_SOUND);
      setBackgroundSoundVolume(agentData.settings?.ambient_sound_volume || DEFAULT_BACKGROUND_SOUND_VOLUME);

      // Parse existing tools to set enabled state
      const existingTools = agentData.settings?.tools || [];
      setAvailableTools(prev => prev.map(tool => ({
        ...tool,
        enabled: hasToolEnabled(existingTools, tool.type)
      })));
      setTransferPhone(agentData.settings?.transfer_phone || '');
      setSalesAgentConfig(agentData.settings?.salesAgentConfig || null);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceSelect = (voice: Voice) => {
    setVoiceModel(voice.voice_id);
    setVoiceName(voice.voice_name);
    closeVoiceModal();
  };

  const closeVoiceModal = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    setPlayingVoiceId(null);
    setCurrentAudio(null);
    setShowVoiceModal(false);
  };

  const handlePlayVoice = (voiceId: string, previewUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Stop currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    // If clicking the same voice that's playing, stop it
    if (playingVoiceId === voiceId) {
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      return;
    }

    // Play new audio
    const audio = new Audio(previewUrl);

    audio.addEventListener('play', () => {
      setPlayingVoiceId(voiceId);
    });

    audio.addEventListener('ended', () => {
      setPlayingVoiceId(null);
      setCurrentAudio(null);
    });

    audio.addEventListener('error', () => {
      setPlayingVoiceId(null);
      setCurrentAudio(null);
    });

    audio.play();
    setCurrentAudio(audio);
  };

  // Filter voices based on selected provider, gender, accent, and search
  const filteredVoices = voices.filter((voice) => {
    if (voice.provider !== voiceProvider) return false;
    if (genderFilter !== 'all' && voice.gender !== genderFilter) return false;
    if (accentFilter !== 'all' && voice.accent !== accentFilter) return false;
    if (searchQuery && !voice.voice_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Get unique accents for the filter
  const availableAccents = Array.from(
    new Set(voices.filter((v) => v.provider === voiceProvider && v.accent).map((v) => v.accent))
  );

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const enabledTools = new Set(
        availableTools.filter((tool) => tool.enabled).map((tool) => tool.type)
      );
      const toolsConfig = {
        endCall: enabledTools.has('end_call'),
        booking: enabledTools.has('book_appointment'),
        availability: enabledTools.has('check_availability'),
        sms: enabledTools.has('send_sms'),
        transfer: isOutboundSalesAgent ? false : enabledTools.has('transfer_call'),
      };

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const isLocalAppUrl = /localhost|127\.0\.0\.1/i.test(appUrl);
      if ((toolsConfig.booking || toolsConfig.availability) && isLocalAppUrl) {
        throw new Error(
          'Calendar tools require a public NEXT_PUBLIC_APP_URL (not localhost). Use your deployed URL or a tunnel (e.g. ngrok), then save again.'
        );
      }

      const mergedSalesConfig = isOutboundSalesAgent
        ? (salesAgentConfig || agent?.settings?.salesAgentConfig || null)
        : undefined;

      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          script,
          settings: {
            voice_model: voiceModel,
            language,
            response_speed: responseSpeed,
            voice_emotion: voiceEmotion || undefined,
            interruption_sensitivity: interruptionSensitivity,
            enable_backchannel: enableBackchannel,
            backchannel_frequency: backchannelFrequency,
            backchannel_words: enableBackchannel
              ? backchannelWordsInput.split(',').map((word) => word.trim()).filter(Boolean)
              : undefined,
            end_call_after_silence_ms:
              Math.max(10, parseInt(endCallAfterSilenceSeconds || '600', 10) || 600) * 1000,
            tools_config: toolsConfig,
            calendar_provider_id: selectedCalendarProviderId || undefined,
            ambient_sound: backgroundSound !== 'none' ? backgroundSound : undefined,
            ambient_sound_volume: backgroundSound !== 'none' ? backgroundSoundVolume : undefined,
            salesAgentConfig: mergedSalesConfig || undefined,
          },
          transfer_phone: transferPhone || undefined,
          webhook_urls: webhookUrls,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update agent');
      }

      // Update phone number binding if changed
      if (selectedPhoneNumber && agent?.retell_agent_id) {
        try {
          await fetch(`/api/phone-numbers/${encodeURIComponent(selectedPhoneNumber)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inboundAgentId: agent.retell_agent_id,
              outboundAgentId: agent.retell_agent_id,
              nickname: `${name} Phone`,
            }),
          });
        } catch (err) {
          console.error('Failed to bind phone number:', err);
          // Don't fail the whole operation if phone binding fails
        }
      }

      setSuccess('Agent updated successfully!');
      setTimeout(() => setSuccess(''), 3000);

      // Refresh agent data
      await fetchAgent();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      router.push('/dashboard/agents');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleTool = (toolType: string) => {
    setAvailableTools(prev => prev.map(tool =>
      tool.type === toolType ? { ...tool, enabled: !tool.enabled } : tool
    ));
  };

  const handleSalesCsvUpload = async (file: File) => {
    setSalesCsvUploading(true);
    setSalesCsvError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/prospects/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setSalesCsvError(data?.error || 'Upload failed');
        return;
      }

      setSalesAgentConfig((prev: any) => ({
        ...(prev || {}),
        dataSource: 'csv_upload',
        csvFileId: data.id,
        csvFileName: data.name,
        csvRowCount: data.rowCount,
      }));
    } catch (error) {
      setSalesCsvError('Upload failed');
    } finally {
      setSalesCsvUploading(false);
    }
  };

  const commitTranscriptForRole = (role: 'user' | 'agent') => {
    const text = (liveTranscriptRef.current.get(role) || '').trim();
    if (!text) return;

    const lastCommitted = committedTranscriptRef.current.get(role);
    if (lastCommitted === text) return;

    committedTranscriptRef.current.set(role, text);
    setCallTranscript(prev => [
      ...prev,
      role === 'user' ? `👤 You: ${text}` : `🤖 Agent: ${text}`,
    ]);
    liveTranscriptRef.current.delete(role);
  };

  // Web call functions
  const startCall = async () => {
    setIsConnecting(true);
    setError('');
    setCallTranscript([]);
    liveTranscriptRef.current.clear();
    committedTranscriptRef.current.clear();

    try {
      // Dynamically import the SDK (client-side only)
      const { RetellWebClient } = await import('retell-client-js-sdk');

      // Get access token from our API
      const response = await fetch(`/api/agents/${agentId}/test-call`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create test call');
      }

      const { access_token, call_id } = await response.json();

      // Initialize Retell Web Client
      const webClient = new RetellWebClient();
      retellWebClientRef.current = webClient;

      // Set up event listeners
      webClient.on('call_started', () => {
        setCallStatus('Connected');
        setIsCallActive(true);
        setIsConnecting(false);
        setCallTranscript(prev => [...prev, '📞 Call started']);
      });

      webClient.on('call_ended', () => {
        commitTranscriptForRole('user');
        commitTranscriptForRole('agent');
        setCallStatus('Call ended');
        setIsCallActive(false);
        setCallTranscript(prev => [...prev, '📞 Call ended']);
        liveTranscriptRef.current.clear();
      });

      webClient.on('agent_start_talking', () => {
        setCallStatus('Agent speaking...');
        // User utterance is complete when agent starts replying
        commitTranscriptForRole('user');
      });

      webClient.on('agent_stop_talking', () => {
        setCallStatus('Listening...');
        // Agent utterance is complete when agent stops talking
        commitTranscriptForRole('agent');
      });

      webClient.on('update', (update: any) => {
        // Retell sends streaming transcript deltas in this event; keep latest text per role.
        if (update.transcript && update.transcript.length > 0) {
          update.transcript.forEach((entry: any) => {
            if (entry?.role && typeof entry.content === 'string') {
              liveTranscriptRef.current.set(entry.role, entry.content);
            }
          });
        }
      });

      webClient.on('metadata', (metadata: any) => {
        const disconnectedReason = metadata?.call?.disconnection_reason || metadata?.disconnection_reason;
        if (disconnectedReason) {
          setCallTranscript(prev => [...prev, `ℹ️ Disconnect reason: ${disconnectedReason}`]);
        }
      });

      webClient.on('error', (error: any) => {
        console.error('Call error:', error);
        setError(`Call error: ${error.message}`);
        setIsCallActive(false);
        setIsConnecting(false);
      });

      // Start the call
      await webClient.startCall({
        accessToken: access_token,
        sampleRate: 24000,
        captureDeviceId: 'default',
      });

    } catch (err: any) {
      console.error('Error starting call:', err);
      setError(err.message || 'Failed to start call');
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    // Commit any remaining transcript before ending
    commitTranscriptForRole('user');
    commitTranscriptForRole('agent');

    if (retellWebClientRef.current) {
      retellWebClientRef.current.stopCall();
      retellWebClientRef.current = null;
    }

    liveTranscriptRef.current.clear();
    committedTranscriptRef.current.clear();
    setIsCallActive(false);
    setIsConnecting(false);
    setCallStatus('');
  };

  const toggleMute = () => {
    // Toggle mute functionality would go here
    setIsMuted(!isMuted);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/50 p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 text-lg">Loading agent...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-muted/50 p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border bg-destructive/10 p-4 text-destructive">
            Agent not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/agents"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Edit Agent</h1>
              <p className="text-muted-foreground">
                Modify configuration, tools, and settings
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'config'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-4 w-4" />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'tools'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="h-4 w-4" />
            Tools & Functions
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'test'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Phone className="h-4 w-4" />
            Test Agent
          </button>
        </div>

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">Basic Settings</h2>

              <div className="space-y-4">
                {/* Agent Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Voice Model */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Voice Model
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowVoiceModal(true)}
                    className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {voiceName || 'Select a voice...'}
                  </button>
                  {voiceModel && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Voice ID: {voiceModel}
                    </p>
                  )}
                </div>

                {/* Language */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="en-IN">English (India)</option>
                    <option value="es-ES">Spanish (Spain)</option>
                    <option value="es-419">Spanish (LatAm)</option>
                    <option value="fr-FR">French</option>
                    <option value="de-DE">German</option>
                    <option value="pt-BR">Portuguese (Brazil)</option>
                    <option value="pt-PT">Portuguese (Portugal)</option>
                    <option value="hi-IN">Hindi</option>
                    <option value="ja-JP">Japanese</option>
                  </select>
                </div>

                {/* Response Speed */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Response Speed
                  </label>
                  <select
                    value={responseSpeed}
                    onChange={(e) => setResponseSpeed(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="fast">Fast</option>
                    <option value="medium">Medium</option>
                    <option value="slow">Slow</option>
                  </select>
                </div>

                {/* Voice Emotion */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Voice Emotion
                  </label>
                  <select
                    value={voiceEmotion}
                    onChange={(e) => setVoiceEmotion(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Default</option>
                    <option value="calm">Calm</option>
                    <option value="sympathetic">Sympathetic</option>
                    <option value="happy">Happy</option>
                    <option value="sad">Sad</option>
                    <option value="angry">Angry</option>
                    <option value="fearful">Fearful</option>
                    <option value="surprised">Surprised</option>
                  </select>
                </div>

                {/* Interruption Sensitivity */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Interruption Sensitivity ({interruptionSensitivity.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={interruptionSensitivity}
                    onChange={(e) => setInterruptionSensitivity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Backchannel Settings */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium">Enable Active Listening Responses</label>
                    <input
                      type="checkbox"
                      checked={enableBackchannel}
                      onChange={(e) => setEnableBackchannel(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                  {enableBackchannel && (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Backchannel Frequency ({backchannelFrequency.toFixed(2)})
                        </label>
                        <p className="mb-1 text-xs text-muted-foreground">
                          How often the agent says brief acknowledgements while the caller is speaking.
                        </p>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={backchannelFrequency}
                          onChange={(e) => setBackchannelFrequency(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Acknowledgement Phrases (comma separated)
                        </label>
                        <input
                          type="text"
                          value={backchannelWordsInput}
                          onChange={(e) => setBackchannelWordsInput(e.target.value)}
                          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="yeah, uh-huh, okay"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* End Call After Silence */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    End Call After Silence (seconds, min 10)
                  </label>
                  <input
                    type="number"
                    min={10}
                    step={1}
                    value={endCallAfterSilenceSeconds}
                    onChange={(e) => setEndCallAfterSilenceSeconds(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Background Sound */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Background Sound
                  </label>
                  <select
                    value={backgroundSound}
                    onChange={(e) => setBackgroundSound(e.target.value as BackgroundSound)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {BACKGROUND_SOUNDS.map((sound) => (
                      <option key={sound.value} value={sound.value}>
                        {sound.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {BACKGROUND_SOUNDS.find(s => s.value === backgroundSound)?.description}
                  </p>
                </div>

                {/* Background Sound Volume */}
                {backgroundSound !== 'none' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Background Sound Volume
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={backgroundSoundVolume}
                        onChange={(e) => setBackgroundSoundVolume(parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-muted-foreground">
                        {backgroundSoundVolume.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Adjust the volume of the ambient background sound (0 = quieter, 2 = louder)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Script/Prompt */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">Agent Script / Prompt</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Define how your agent behaves, responds, and handles conversations
              </p>

              <div className="relative">
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={20}
                  className="w-full rounded-lg border px-3 py-2 pr-12 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your agent's instructions and behavior guidelines..."
                />
                <button
                  type="button"
                  onClick={() => setIsPromptExpanded(true)}
                  className="absolute bottom-2 right-2 rounded-md border bg-background/90 p-2 text-muted-foreground transition-colors hover:text-foreground"
                  title="Open full-size prompt editor"
                  aria-label="Open full-size prompt editor"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {agent?.settings?.template_id === 'sales-agent-outbound' && (
              <div className="rounded-lg border bg-card p-6">
                <h2 className="mb-4 text-xl font-semibold">Outbound Sales Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Lead Source</label>
                    <select
                      value={salesAgentConfig?.dataSource || 'csv_upload'}
                      onChange={(e) =>
                        setSalesAgentConfig((prev: any) => ({
                          ...(prev || {}),
                          dataSource: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="csv_upload">CSV Upload</option>
                      <option value="google_sheets">Google Sheets</option>
                    </select>
                  </div>

                  {(salesAgentConfig?.dataSource || 'csv_upload') === 'csv_upload' ? (
                    <div className="space-y-3 rounded-lg border p-4">
                      <div className="text-sm">
                        Current CSV:{' '}
                        <strong>{salesAgentConfig?.csvFileName || salesAgentConfig?.csvFileId || 'None'}</strong>
                        {salesAgentConfig?.csvRowCount ? ` (${salesAgentConfig.csvRowCount} rows)` : ''}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                          {salesCsvUploading ? 'Uploading...' : 'Upload New CSV'}
                          <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSalesCsvUpload(file);
                            }}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setSalesAgentConfig((prev: any) => ({
                              ...(prev || {}),
                              csvFileId: '',
                              csvFileName: '',
                              csvRowCount: 0,
                            }))
                          }
                        >
                          Remove CSV
                        </Button>
                      </div>
                      {salesCsvError && (
                        <div className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {salesCsvError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Spreadsheet ID</label>
                        <input
                          type="text"
                          value={salesAgentConfig?.inputSheetId || ''}
                          onChange={(e) =>
                            setSalesAgentConfig((prev: any) => ({
                              ...(prev || {}),
                              inputSheetId: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Sheet Tab Name</label>
                        <input
                          type="text"
                          value={salesAgentConfig?.inputSheetName || ''}
                          onChange={(e) =>
                            setSalesAgentConfig((prev: any) => ({
                              ...(prev || {}),
                              inputSheetName: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 text-sm font-semibold">Calling Schedule</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
                        <select
                          value={salesAgentConfig?.schedule?.type || 'weekly'}
                          onChange={(e) =>
                            setSalesAgentConfig((prev: any) => ({
                              ...(prev || {}),
                              schedule: { ...(prev?.schedule || {}), type: e.target.value },
                            }))
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekdays</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Timezone</label>
                        <input
                          type="text"
                          value={salesAgentConfig?.schedule?.timezone || 'America/Toronto'}
                          onChange={(e) =>
                            setSalesAgentConfig((prev: any) => ({
                              ...(prev || {}),
                              schedule: { ...(prev?.schedule || {}), timezone: e.target.value },
                            }))
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Start Time</label>
                        <input
                          type="time"
                          value={salesAgentConfig?.schedule?.startTime || '09:00'}
                          onChange={(e) =>
                            setSalesAgentConfig((prev: any) => ({
                              ...(prev || {}),
                              schedule: { ...(prev?.schedule || {}), startTime: e.target.value },
                            }))
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">End Time</label>
                        <input
                          type="time"
                          value={salesAgentConfig?.schedule?.endTime || '17:00'}
                          onChange={(e) =>
                            setSalesAgentConfig((prev: any) => ({
                              ...(prev || {}),
                              schedule: { ...(prev?.schedule || {}), endTime: e.target.value },
                            }))
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Gap Between Calls (minutes)</label>
                        <input
                          type="number"
                          min="1"
                          value={salesAgentConfig?.schedule?.callIntervalMinutes ?? 15}
                          onChange={(e) =>
                            setSalesAgentConfig((prev: any) => ({
                              ...(prev || {}),
                              schedule: { ...(prev?.schedule || {}), callIntervalMinutes: parseInt(e.target.value || '15', 10) },
                            }))
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Max Calls Per Day</label>
                        <input
                          type="number"
                          min="1"
                          value={salesAgentConfig?.maxCallsPerDay ?? 100}
                          onChange={(e) =>
                            setSalesAgentConfig((prev: any) => ({
                              ...(prev || {}),
                              maxCallsPerDay: parseInt(e.target.value || '100', 10),
                            }))
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Saved custom slots: {Array.isArray(salesAgentConfig?.schedule?.specificDateTimes) ? salesAgentConfig.schedule.specificDateTimes.length : 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            {/* Tool Configuration */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">Integration Settings</h2>

              <div className="space-y-4">
                {/* Phone Number */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Phone Number
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(true)}
                    className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm">
                          {selectedPhoneNumber || 'Select or purchase a phone number...'}
                        </div>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Phone number for making and receiving calls with this agent
                  </p>
                </div>

                {!isOutboundSalesAgent && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Transfer Phone Number
                    </label>
                    <input
                      type="tel"
                      value={transferPhone}
                      onChange={(e) => setTransferPhone(e.target.value)}
                      placeholder="+1234567890"
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Required for call transfer tool
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Calendar For This Agent
                  </label>
                  <select
                    value={selectedCalendarProviderId}
                    onChange={(e) => setSelectedCalendarProviderId(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Pillow Internal Calendar (built-in)</option>
                    {calendarProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.provider.toUpperCase()} {provider.provider_email ? `- ${provider.provider_email}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Availability and bookings from this agent will use Pillow Internal Calendar unless you choose Google/Outlook.
                  </p>
                </div>
              </div>
            </div>

            {/* Available Tools */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">Available Functions</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Enable or disable tools for your agent
              </p>

              <div className="space-y-3">
                {availableTools
                  .filter((tool) => !(isOutboundSalesAgent && tool.type === 'transfer_call'))
                  .map((tool) => (
                  <div
                    key={tool.type}
                    className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                      tool.enabled ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={tool.enabled}
                      onChange={() => toggleTool(tool.type)}
                      disabled={tool.config?.requiresPhone && !transferPhone}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{tool.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {tool.description}
                      </div>
                      {tool.config?.requiresPhone && !transferPhone && (
                        <div className="mt-1 text-xs text-orange-600">
                          Requires Transfer Phone Number
                        </div>
                      )}
                    </div>
                    {tool.enabled && (
                      <div className="rounded-full bg-primary px-2 py-1 text-xs text-white">
                        Active
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            {/* Web Call Testing */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">Test Your Agent</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Start a voice call to test your agent's behavior and responses in real-time
              </p>

              {/* Call Controls */}
              <div className="mb-6 flex items-center justify-center gap-4">
                {!isCallActive && !isConnecting && (
                  <Button
                    onClick={startCall}
                    size="lg"
                    className="gap-2 px-8"
                  >
                    <PhoneCall className="h-5 w-5" />
                    Start Call
                  </Button>
                )}

                {isConnecting && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Connecting...</span>
                  </div>
                )}

                {isCallActive && (
                  <div className="flex gap-3">
                    <Button
                      onClick={toggleMute}
                      variant="outline"
                      size="lg"
                      className="gap-2"
                    >
                      {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      {isMuted ? 'Unmute' : 'Mute'}
                    </Button>
                    <Button
                      onClick={endCall}
                      variant="destructive"
                      size="lg"
                      className="gap-2"
                    >
                      <PhoneOff className="h-5 w-5" />
                      End Call
                    </Button>
                  </div>
                )}
              </div>

              {/* Call Status */}
              {callStatus && (
                <div className="mb-4 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    {callStatus}
                  </div>
                </div>
              )}

              {/* Transcript */}
              {callTranscript.length > 0 && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h3 className="mb-3 font-semibold">Live Transcript</h3>
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {callTranscript.map((message, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-3 text-sm ${
                          message.includes('Agent')
                            ? 'bg-primary/10 text-primary'
                            : message.includes('You')
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {!isCallActive && !isConnecting && callTranscript.length === 0 && (
                <div className="rounded-lg bg-muted/50 p-6">
                  <h3 className="mb-3 font-semibold">How to Test</h3>
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                    <li>Click "Start Call" to begin a voice conversation</li>
                    <li>Allow microphone access when prompted</li>
                    <li>Speak naturally to test the agent's responses</li>
                    <li>Watch the live transcript to see the conversation</li>
                    <li>Click "End Call" when finished testing</li>
                  </ol>
                  <div className="mt-4 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Note:</strong> Make sure your microphone is enabled and working properly.
                  </div>
                </div>
              )}
            </div>

            {/* Phone Number Assignment */}
            <div className="rounded-lg border bg-card p-6">
              <button
                onClick={() => setShowPhoneModal(true)}
                className="group relative w-full overflow-hidden rounded-xl px-6 py-4 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-size-200 animate-gradient" />
                <div className="relative flex items-center justify-center gap-3">
                  <Phone className="h-5 w-5" />
                  <span className="text-lg font-semibold">
                    {selectedPhoneNumber ? 'Change Phone Number' : 'Assign Phone Number'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Voice Selection Modal */}
        {showVoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="max-h-[85vh] w-full max-w-5xl overflow-auto rounded-2xl border border-white/10 bg-card shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-primary/10 via-background to-secondary/10 px-5 py-4">
                <div>
                  <h2 className="text-2xl font-bold">Select Voice</h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredVoices.length} voices available
                  </p>
                </div>
                <button
                  onClick={closeVoiceModal}
                  className="rounded-lg p-2 transition-colors hover:bg-muted/70"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Filters */}
              <div className="mb-4 flex flex-wrap gap-3 border-b border-white/10 px-5 pb-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Provider</label>
                  <select
                    value={voiceProvider}
                    onChange={(e) => setVoiceProvider(e.target.value)}
                    className="rounded-xl border bg-card px-3 py-2 text-sm"
                  >
                    <option value="elevenlabs">ElevenLabs</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Gender</label>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="rounded-xl border bg-card px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                {availableAccents.length > 0 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Accent</label>
                    <select
                      value={accentFilter}
                      onChange={(e) => setAccentFilter(e.target.value)}
                      className="rounded-xl border bg-card px-3 py-2 text-sm"
                    >
                      <option value="all">All</option>
                      {availableAccents.map((accent) => (
                        <option key={accent} value={accent}>
                          {accent}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium">Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search voices..."
                    className="w-full rounded-xl border bg-card px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Voice Grid */}
              <div className="px-5 pb-5">
              {loadingVoices ? (
                <div className="py-12 text-center text-muted-foreground">
                  Loading voices...
                </div>
              ) : filteredVoices.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No voices found
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredVoices.map((voice) => (
                    <button
                      key={voice.voice_id}
                      onClick={() => handleVoiceSelect(voice)}
                      className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all hover:bg-muted ${
                        voiceModel === voice.voice_id ? 'border-primary bg-primary/10 shadow-sm' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{voice.voice_name}</div>
                        <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                          <span>{voice.gender}</span>
                          {voice.accent && <span>• {voice.accent}</span>}
                          {voice.age && <span>• {voice.age}</span>}
                        </div>
                      </div>
                      {voice.preview_audio_url && (
                        <button
                          onClick={(e) => handlePlayVoice(voice.voice_id, voice.preview_audio_url!, e)}
                          className="ml-2 rounded-lg p-2 transition-colors hover:bg-background"
                        >
                          {playingVoiceId === voice.voice_id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* Phone Number Modal */}
        {showPhoneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-2xl rounded-lg bg-card shadow-lg">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-xl font-semibold">Select Phone Number</h2>
                <button
                  onClick={() => setShowPhoneModal(false)}
                  className="rounded-lg p-2 hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[500px] overflow-y-auto p-4">
                {/* Purchase New Number */}
                <div className="mb-6 rounded-lg border bg-muted/30 p-4">
                  <h3 className="mb-3 font-medium">Purchase New Number</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm">Area Code (3 digits)</label>
                      <input
                        type="text"
                        value={newPhoneAreaCode}
                        onChange={(e) => setNewPhoneAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="e.g., 415"
                        maxLength={3}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        If you see "No phone numbers of this area code", try a different code (e.g., 415, 212, 647) or switch provider.
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">Nickname (optional)</label>
                      <input
                        type="text"
                        value={newPhoneNickname}
                        onChange={(e) => setNewPhoneNickname(e.target.value)}
                        placeholder="e.g., Main Support Line"
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                    <Button
                      onClick={handlePurchasePhone}
                      disabled={purchasingPhone || newPhoneAreaCode.length !== 3}
                      className="w-full"
                    >
                      {purchasingPhone ? 'Purchasing...' : 'Purchase & Assign Number'}
                    </Button>
                  </div>
                </div>

                {/* Existing Numbers */}
                <div>
                  <h3 className="mb-3 font-medium">Existing Numbers</h3>
                  {loadingPhoneNumbers ? (
                    <div className="py-8 text-center text-muted-foreground">Loading...</div>
                  ) : phoneNumbers.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No phone numbers available. Purchase one above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {phoneNumbers.map((phone: any) => (
                        <button
                          key={phone.phone_number}
                          onClick={async () => {
                            setSelectedPhoneNumber(phone.phone_number);
                            setShowPhoneModal(false);

                            // Immediately bind the phone number to this agent
                            if (agent?.retell_agent_id) {
                              try {
                                await fetch(`/api/phone-numbers/${encodeURIComponent(phone.phone_number)}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    inboundAgentId: agent.retell_agent_id,
                                    outboundAgentId: agent.retell_agent_id,
                                    nickname: `${name} Phone`,
                                  }),
                                });
                                setSuccess('Phone number assigned successfully!');
                                setTimeout(() => setSuccess(''), 3000);
                              } catch (err) {
                                console.error('Failed to bind phone number:', err);
                                setError('Failed to assign phone number');
                              }
                            }
                          }}
                          className={`w-full rounded-lg border p-3 text-left transition-colors hover:border-primary ${
                            selectedPhoneNumber === phone.phone_number
                              ? 'border-primary bg-primary/5'
                              : ''
                          }`}
                        >
                          <div className="font-medium">
                            {phone.phone_number_pretty || phone.phone_number}
                          </div>
                          {phone.nickname && (
                            <div className="text-sm text-muted-foreground">{phone.nickname}</div>
                          )}
                          {phone.inbound_agent_id && phone.inbound_agent_id !== agent?.retell_agent_id && (
                            <div className="mt-1 text-xs text-orange-600">
                              Already assigned to another agent
                            </div>
                          )}
                          {phone.inbound_agent_id === agent?.retell_agent_id && (
                            <div className="mt-1 text-xs text-green-600">
                              Currently assigned to this agent
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {isPromptExpanded && (
          <div className="fixed inset-0 z-50 bg-black/60 p-4">
            <div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-lg border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-lg font-semibold">Agent Script / Prompt</h2>
                <button
                  type="button"
                  onClick={() => setIsPromptExpanded(false)}
                  className="rounded-lg p-2 hover:bg-muted"
                  aria-label="Close prompt editor"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 p-4">
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="h-full w-full resize-none rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your agent's instructions and behavior guidelines..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
