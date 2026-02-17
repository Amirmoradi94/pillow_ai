'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileText, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { agentTemplates, type AgentTemplate, generateTools } from '@/lib/agent-templates';
import { Button } from '@/components/ui/button';
import { SalesAgentConfig, type SalesAgentConfig as SalesConfig } from '@/components/agents/sales-agent-config';
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

const CANADA_TIMEZONES = [
  { value: 'America/St_Johns', label: 'Newfoundland (America/St_Johns)' },
  { value: 'America/Halifax', label: 'Atlantic (America/Halifax)' },
  { value: 'America/Toronto', label: 'Eastern (America/Toronto)' },
  { value: 'America/Winnipeg', label: 'Central (America/Winnipeg)' },
  { value: 'America/Edmonton', label: 'Mountain (America/Edmonton)' },
  { value: 'America/Vancouver', label: 'Pacific (America/Vancouver)' },
  { value: 'America/Whitehorse', label: 'Yukon (America/Whitehorse)' },
];

export default function NewAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState<'template' | 'sales-config' | 'configure'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [salesAgentConfig, setSalesAgentConfig] = useState<SalesConfig | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [language, setLanguage] = useState<string>('en-US');
  const [voiceEmotion, setVoiceEmotion] = useState<string>('');
  const [interruptionSensitivity, setInterruptionSensitivity] = useState<number>(0.5);
  const [enableBackchannel, setEnableBackchannel] = useState<boolean>(true);
  const [backchannelFrequency, setBackchannelFrequency] = useState<number>(0.8);
  const [backchannelWordsInput, setBackchannelWordsInput] = useState<string>('yeah, uh-huh, okay');
  const [endCallAfterSilenceSeconds, setEndCallAfterSilenceSeconds] = useState<string>('600');
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<string>('elevenlabs');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [accentFilter, setAccentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [transferPhone, setTransferPhone] = useState<string>('');

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
  const [calendarProviders, setCalendarProviders] = useState<CalendarProvider[]>([]);
  const [selectedCalendarProviderId, setSelectedCalendarProviderId] = useState<string>('');
  const [agentCalendarName, setAgentCalendarName] = useState<string>('Branch Calendar');
  const [agentCalendarTimezone, setAgentCalendarTimezone] = useState<string>('America/Toronto');
  const [agentCalendarStartTime, setAgentCalendarStartTime] = useState<string>('09:00');
  const [agentCalendarEndTime, setAgentCalendarEndTime] = useState<string>('17:00');
  const [agentCalendarSlotDuration, setAgentCalendarSlotDuration] = useState<number>(30);

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setAgentCalendarName(`${template.name} Calendar`);
    setSelectedVoice(template.suggestedVoice);
    setSelectedVoiceName(template.suggestedVoice.split('-')[1] || template.suggestedVoice);
    setLanguage(template.language || 'en-US');

    // Sales Agent needs special configuration
    if (template.id === 'sales-agent-outbound') {
      setStep('sales-config');
    } else {
      setStep('configure');
    }
  };

  const handleSalesAgentConfigComplete = (config: SalesConfig) => {
    setSalesAgentConfig(config);
    setStep('configure');
  };

  // Fetch voices when modal opens
  useEffect(() => {
    fetchCalendarProviders();
  }, []);

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

  useEffect(() => {
    if (showVoiceModal && voices.length === 0) {
      fetchVoices();
    }
  }, [showVoiceModal]);

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

  const fetchPhoneNumbers = async () => {
    setLoadingPhoneNumbers(true);
    try {
      const response = await fetch('/api/phone-numbers');
      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data.phoneNumbers || []);
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPurchasingPhone(false);
    }
  };

  // Fetch phone numbers when modal opens
  useEffect(() => {
    if (showPhoneModal && phoneNumbers.length === 0) {
      fetchPhoneNumbers();
    }
  }, [showPhoneModal]);

  const handleVoiceSelect = (voice: Voice) => {
    setSelectedVoice(voice.voice_id);
    setSelectedVoiceName(voice.voice_name);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleCreateAgent = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    setError('');

    if (!selectedPhoneNumber) {
      setError('Phone number is required to create an agent.');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Upload knowledge base if files are provided
      let knowledgeBaseId = null;

      if (files.length > 0) {
        const formData = new FormData();
        formData.append('knowledge_base_name', `${selectedTemplate.name} - Knowledge Base`);
        files.forEach((file) => {
          formData.append('files', file);
        });

        const kbResponse = await fetch('/api/knowledge-bases', {
          method: 'POST',
          body: formData,
        });

        if (!kbResponse.ok) {
          throw new Error('Failed to create knowledge base');
        }

        const kbData = await kbResponse.json();
        knowledgeBaseId = kbData.knowledge_base_id;
      }

      // Step 2: Create agent with template and custom instructions
      const agentPrompt = customInstructions
        ? `${selectedTemplate.prompt}\n\nAdditional Instructions:\n${customInstructions}`
        : selectedTemplate.prompt;

      // Don't generate tools on client - will be done on server with API keys

      const agentSettings: Record<string, any> = {
        voice_model: selectedVoice || selectedTemplate.suggestedVoice,
        language,
        response_speed: 'medium',
        voice_emotion: voiceEmotion || undefined,
        interruption_sensitivity: interruptionSensitivity,
        enable_backchannel: enableBackchannel,
        backchannel_frequency: backchannelFrequency,
        backchannel_words: enableBackchannel
          ? backchannelWordsInput.split(',').map((word) => word.trim()).filter(Boolean)
          : undefined,
        end_call_after_silence_ms:
          Math.max(10, parseInt(endCallAfterSilenceSeconds || '600', 10) || 600) * 1000,
        calendar_provider_id: selectedCalendarProviderId || undefined,
        ambient_sound: backgroundSound !== 'none' ? backgroundSound : undefined,
        ambient_sound_volume: backgroundSound !== 'none' ? backgroundSoundVolume : undefined,
      };

      if (selectedTemplate.id === 'sales-agent-outbound' && salesAgentConfig) {
        agentSettings.salesAgentConfig = salesAgentConfig;
      }

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedTemplate.name,
          script: agentPrompt,
          settings: agentSettings,
          template_id: selectedTemplate.id,
          knowledge_base_ids: knowledgeBaseId ? [knowledgeBaseId] : [],
          tools_config: selectedTemplate.toolsConfig,
          transfer_phone: transferPhone || undefined,
          phone_number: selectedPhoneNumber,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create agent');
      }

      const agentData = await response.json();

      // Step 3: Create dedicated calendar settings + availability for this agent.
      // Do not block agent creation if calendar setup fails; user can fix in Calendar page.
      let calendarSetupFailed = false;
      try {
        const calendarSetupResponse = await fetch('/api/calendar/agent-calendars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_id: agentData.agent.id,
            calendar_provider_id: selectedCalendarProviderId,
            calendar_name: agentCalendarName,
            timezone: agentCalendarTimezone,
            day_start: agentCalendarStartTime,
            day_end: agentCalendarEndTime,
            slot_duration: agentCalendarSlotDuration,
          }),
        });

        if (!calendarSetupResponse.ok) {
          calendarSetupFailed = true;
          const data = await calendarSetupResponse.json().catch(() => ({}));
          console.error('Calendar setup failed after agent creation:', data);
        }
      } catch (calendarError) {
        calendarSetupFailed = true;
        console.error('Calendar setup failed after agent creation:', calendarError);
      }

      // Step 4: If phone number selected, bind it to the agent
      if (selectedPhoneNumber && agentData.agent?.retell_agent_id) {
        try {
          await fetch(`/api/phone-numbers/${encodeURIComponent(selectedPhoneNumber)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inboundAgentId: agentData.agent.retell_agent_id,
              outboundAgentId: agentData.agent.retell_agent_id,
              nickname: `${selectedTemplate.name} Phone`,
            }),
          });
        } catch (err) {
          console.error('Failed to bind phone number:', err);
          // Don't fail the whole operation if phone binding fails
        }
      }

      // Success! Redirect to agents list
      if (calendarSetupFailed) {
        sessionStorage.setItem(
          'agent_create_warning',
          'Agent was created, but calendar setup failed. Please open Calendar page to complete setup.'
        );
      }
      router.push('/dashboard/agents');
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            {step === 'template' ? (
              <Link
                href="/dashboard/agents"
                className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Agents
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setStep('template')}
                className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Agents
              </button>
            )}
            <h1 className="text-3xl font-bold">Create New Agent</h1>
            <p className="text-muted-foreground">
              {step === 'template'
                ? 'Select a template to get started'
                : 'Configure your agent'}
            </p>
          </div>
        </div>

        {/* Template Selection */}
        {step === 'template' && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 text-xl font-semibold">Select Template</h2>
              <p className="text-sm text-muted-foreground">
                Choose a pre-configured template for your industry
              </p>
            </div>

            {/* Sales Agent - Featured */}
            {agentTemplates
              .filter((t) => t.id === 'sales-agent-outbound')
              .map((template) => (
                <div key={template.id} className="mb-8">
                  <div
                    onClick={() => handleTemplateSelect(template)}
                    className="cursor-pointer rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 transition-all hover:border-amber-300 hover:shadow-lg"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-4xl">{template.icon}</span>
                      <div>
                        <div className="flex flex-wrap gap-1">
                          {template.capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <h3 className="mb-2 font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {template.industry}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                        </span>
                        Outbound Calling
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-muted/50 px-4 text-sm text-muted-foreground">
                        Inbound Call Templates
                      </span>
                    </div>
                  </div>
                </div>
              ))}

            {/* Regular Templates Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agentTemplates
                .filter((t) => t.id !== 'sales-agent-outbound')
                .map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="cursor-pointer rounded-lg border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-4xl">{template.icon}</span>
                      <div>
                        <div className="flex flex-wrap gap-1">
                          {template.capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="rounded-full bg-muted px-2 py-1 text-xs"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <h3 className="mb-2 font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    <div className="mt-4">
                      <span className="text-xs text-muted-foreground">
                        {template.industry}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Sales Agent Configuration Step */}
        {step === 'sales-config' && selectedTemplate && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Configure Sales Agent</h1>
              <p className="text-muted-foreground">
                Set up your outbound calling agent with schedule and call settings
              </p>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Next step includes full voice agent settings: voice selection, language, voice emotion,
              interruption sensitivity, active listening responses, end-call silence timeout, and ambient sound.
            </div>

            <SalesAgentConfig
              onComplete={handleSalesAgentConfigComplete}
              onBack={() => setStep('template')}
            />
          </div>
        )}

        {/* Configuration Step */}
        {step === 'configure' && selectedTemplate && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-4xl">{selectedTemplate.icon}</span>
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedTemplate.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.industry}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('template')}
                  className="ml-auto"
                >
                  Change Template
                </Button>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Custom Instructions */}
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Custom Instructions (Optional)
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Add any specific instructions for your business. For example: 'Our office hours are 9 AM to 5 PM, closed on weekends.'"
                    className="min-h-[120px] w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    This will be added to the agent's base prompt
                  </p>
                </div>

                {/* Knowledge Base Upload */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Knowledge Base (Optional)
                  </label>
                  <div className="space-y-2">
                    <label
                      htmlFor="file-upload"
                      className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-primary"
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Upload Files
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, TXT, DOCX (max 50MB each, up to 25 files)
                        </p>
                      </div>
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept=".pdf,.txt,.docx,.doc"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {files.length > 0 && (
                      <div className="space-y-1">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 rounded-lg bg-muted p-2 text-sm"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="flex-1 truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload documents that the agent can reference to answer questions
                  </p>
                </div>

                {/* Voice Selection */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Voice Selection
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowVoiceModal(true)}
                    className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{selectedVoiceName || 'Select a voice'}</div>
                        {selectedVoice && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {selectedVoice}
                          </div>
                        )}
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
                    Select the voice for your agent. Preview available in selector.
                  </p>
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

                {/* Interaction Settings */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <label className="mb-3 block text-sm font-medium">
                    Interaction Settings
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Voice Emotion</label>
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
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Interruption Sensitivity ({interruptionSensitivity.toFixed(2)})</label>
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
                    <div className="md:col-span-2 flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                      <label className="text-sm font-medium">Enable Active Listening Responses</label>
                      <input
                        type="checkbox"
                        checked={enableBackchannel}
                        onChange={(e) => setEnableBackchannel(e.target.checked)}
                        className="h-4 w-4"
                      />
                    </div>
                    {enableBackchannel && (
                      <>
                        <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Backchannel Frequency ({backchannelFrequency.toFixed(2)})</label>
                        <p className="mb-1 text-xs text-muted-foreground">How often the agent says brief acknowledgements while the caller is speaking.</p>
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
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Acknowledgement Phrases (comma separated)</label>
                          <input
                            type="text"
                            value={backchannelWordsInput}
                            onChange={(e) => setBackchannelWordsInput(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="yeah, uh-huh, okay"
                          />
                        </div>
                      </>
                    )}
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">End Call After Silence (seconds, min 10)</label>
                      <input
                        type="number"
                        min={10}
                        step={1}
                        value={endCallAfterSilenceSeconds}
                        onChange={(e) => setEndCallAfterSilenceSeconds(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
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

                {/* Phone Number (Required) */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Phone Number (Required)
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
                    Phone number for making and receiving calls with this agent. If you don’t have one, set it up in{' '}
                    <Link href="/dashboard/onboarding/phone-number" className="underline">Phone Numbers</Link>.
                  </p>
                </div>

                {/* Transfer Phone (Optional) */}
                {selectedTemplate.toolsConfig.transfer && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Transfer Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={transferPhone}
                      onChange={(e) => setTransferPhone(e.target.value)}
                      placeholder="+1234567890"
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Phone number to transfer calls to (include country code, e.g., +1).
                    </p>
                  </div>
                )}

                <div className="rounded-lg border bg-muted/30 p-4">
                  <label className="mb-2 block text-sm font-medium">
                    Dedicated Agent Calendar
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
                  {calendarProviders.length === 0 ? (
                    <p className="mt-1 text-xs text-amber-600">
                      No connected calendars found. Connect one in{' '}
                      <Link href="/dashboard/calendar" className="underline">
                        Calendar Settings
                      </Link>{' '}
                      first.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Uses Pillow Internal Calendar by default. Optional: choose Google/Outlook now or later.
                    </p>
                  )}

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Calendar Name</label>
                      <input
                        type="text"
                        value={agentCalendarName}
                        onChange={(e) => setAgentCalendarName(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Downtown Branch Calendar"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Timezone</label>
                      <select
                        value={agentCalendarTimezone}
                        onChange={(e) => setAgentCalendarTimezone(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {CANADA_TIMEZONES.map((timezone) => (
                          <option key={timezone.value} value={timezone.value}>
                            {timezone.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Open Time</label>
                      <input
                        type="time"
                        value={agentCalendarStartTime}
                        onChange={(e) => setAgentCalendarStartTime(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Close Time</label>
                      <input
                        type="time"
                        value={agentCalendarEndTime}
                        onChange={(e) => setAgentCalendarEndTime(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Slot Duration (minutes)</label>
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={agentCalendarSlotDuration}
                        onChange={(e) => setAgentCalendarSlotDuration(parseInt(e.target.value || '30', 10))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleCreateAgent}
                    disabled={loading || !selectedPhoneNumber}
                    className="flex-1"
                    size="lg"
                  >
                    {loading ? 'Creating Agent...' : 'Create Agent'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voice Selection Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-primary/10 via-background to-secondary/10 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">Select Voice</h2>
                <p className="text-xs text-muted-foreground">
                  {filteredVoices.length} voices available
                </p>
              </div>
              <button
                onClick={closeVoiceModal}
                className="rounded-lg p-2 transition-colors hover:bg-muted/70"
              >
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
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-white/10 bg-muted/20 px-4 py-2">
              {['elevenlabs', 'cartesia', 'minimax', 'openai', 'deepgram'].map((provider) => (
                <button
                  key={provider}
                  onClick={() => {
                    setVoiceProvider(provider);
                    setGenderFilter('all');
                    setAccentFilter('all');
                    setSearchQuery('');
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    voiceProvider === provider
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {provider === 'elevenlabs' ? 'ElevenLabs' : provider.charAt(0).toUpperCase() + provider.slice(1)}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 border-b border-white/10 bg-background px-4 py-4">
              {/* Gender Filter */}
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="all">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>

              {/* Accent Filter */}
              <select
                value={accentFilter}
                onChange={(e) => setAccentFilter(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="all">Accent</option>
                {availableAccents.map((accent) => (
                  <option key={accent} value={accent}>
                    {accent}
                  </option>
                ))}
              </select>

              {/* Search */}
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </div>

            {/* Content */}
            <div className="max-h-[65vh] overflow-y-auto p-4">
              {loadingVoices ? (
                <div className="py-12 text-center text-muted-foreground">Loading voices...</div>
              ) : filteredVoices.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No voices found</div>
              ) : (
                <div className="space-y-4">
                  {/* Recommended Voices - first 4 */}
                  {filteredVoices.slice(0, 4).length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-muted/20 p-3">
                      <h3 className="mb-3 text-sm font-semibold">Recommended Voices</h3>
                      <div className="grid grid-cols-4 gap-3">
                        {filteredVoices.slice(0, 4).map((voice) => (
                          <div
                            key={voice.voice_id}
                            onClick={() => handleVoiceSelect(voice)}
                            className={`cursor-pointer rounded-xl border p-3 transition-all hover:border-primary ${
                              selectedVoice === voice.voice_id ? 'border-primary bg-primary/10 shadow-sm' : 'bg-card'
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-sm font-medium">{voice.voice_name}</div>
                              {voice.preview_audio_url && (
                                <button
                                  onClick={(e) => handlePlayVoice(voice.voice_id, voice.preview_audio_url, e)}
                                  className="rounded-md p-1 text-primary transition-colors hover:bg-primary/10 hover:text-primary/80"
                                >
                                  {playingVoiceId === voice.voice_id ? (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                      className="animate-pulse"
                                    >
                                      <rect x="6" y="4" width="4" height="16" />
                                      <rect x="14" y="4" width="4" height="16" />
                                    </svg>
                                  ) : (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                    >
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {voice.accent} · {voice.gender}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              ID: {voice.voice_id}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Voices Table */}
                  <div>
                    <div className="mb-2 grid grid-cols-12 gap-4 border-b border-white/10 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <div className="col-span-4">Voice</div>
                      <div className="col-span-4">Trait</div>
                      <div className="col-span-4">Voice ID</div>
                    </div>
                    <div className="space-y-1">
                      {filteredVoices.map((voice) => (
                        <div
                          key={voice.voice_id}
                          onClick={() => handleVoiceSelect(voice)}
                          className={`grid cursor-pointer grid-cols-12 gap-4 rounded-xl border p-3 transition-colors hover:bg-muted ${
                            selectedVoice === voice.voice_id ? 'border-primary bg-primary/10' : 'border-transparent'
                          }`}
                        >
                          <div className="col-span-4 flex items-center gap-2">
                            {voice.preview_audio_url && (
                              <button
                                onClick={(e) => handlePlayVoice(voice.voice_id, voice.preview_audio_url!, e)}
                                className="rounded-md p-1 text-primary transition-colors hover:bg-primary/10 hover:text-primary/80"
                              >
                                {playingVoiceId === voice.voice_id ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="animate-pulse"
                                  >
                                    <rect x="6" y="4" width="4" height="16" />
                                    <rect x="14" y="4" width="4" height="16" />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </button>
                            )}
                            <div className="text-sm font-medium">{voice.voice_name}</div>
                          </div>
                          <div className="col-span-4 flex items-center gap-2 text-sm text-muted-foreground">
                            {voice.accent && <span>{voice.accent}</span>}
                            {voice.age && (
                              <>
                                <span>·</span>
                                <span>{voice.age}</span>
                              </>
                            )}
                            <span>·</span>
                            <span className="capitalize">{voice.gender}</span>
                          </div>
                          <div className="col-span-4 flex items-center text-sm text-muted-foreground">
                            {voice.voice_id}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
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
                    {purchasingPhone ? 'Purchasing...' : 'Purchase Number'}
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
                        onClick={() => {
                          setSelectedPhoneNumber(phone.phone_number);
                          setShowPhoneModal(false);
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
                        {phone.inbound_agent_id && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Already assigned to an agent
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
    </div>
  );
}
