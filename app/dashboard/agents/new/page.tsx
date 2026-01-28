'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileText, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { agentTemplates, type AgentTemplate, generateTools } from '@/lib/agent-templates';
import { Button } from '@/components/ui/button';

interface Voice {
  voice_id: string;
  voice_name: string;
  provider: string;
  gender: string;
  accent?: string;
  age?: string;
  preview_audio_url?: string;
}

export default function NewAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState<'template' | 'configure'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<string>('elevenlabs');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [accentFilter, setAccentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setSelectedVoice(template.suggestedVoice);
    setSelectedVoiceName(template.suggestedVoice.split('-')[1] || template.suggestedVoice);
    setStep('configure');
  };

  // Fetch voices when modal opens
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

  const handleVoiceSelect = (voice: Voice) => {
    setSelectedVoice(voice.voice_id);
    setSelectedVoiceName(voice.voice_name);
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

      // Generate tools from template config
      const tools = generateTools(selectedTemplate.toolsConfig);

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedTemplate.name,
          script: agentPrompt,
          settings: {
            voice_model: selectedVoice || selectedTemplate.suggestedVoice,
            language: selectedTemplate.language,
            response_speed: 'medium',
          },
          template_id: selectedTemplate.id,
          knowledge_base_ids: knowledgeBaseId ? [knowledgeBaseId] : [],
          tools: tools,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create agent');
      }

      // Success! Redirect to agents list
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
            <Link
              href="/dashboard/agents"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Agents
            </Link>
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

            {/* Start from Blank Option */}
            <div
              onClick={() => router.push('/dashboard/agents/new/blank')}
              className="flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                <span className="text-3xl">+</span>
              </div>
              <div>
                <h3 className="font-semibold">Start from Blank</h3>
                <p className="text-sm text-muted-foreground">
                  Create a custom agent from scratch
                </p>
              </div>
            </div>

            {/* Template Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agentTemplates.map((template) => (
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

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleCreateAgent}
                    disabled={loading}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-4xl rounded-lg bg-card shadow-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-xl font-semibold">Select Voice</h2>
              <button
                onClick={() => setShowVoiceModal(false)}
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

            {/* Tabs */}
            <div className="flex gap-4 border-b px-4">
              {['elevenlabs', 'cartesia', 'minimax', 'openai', 'deepgram'].map((provider) => (
                <button
                  key={provider}
                  onClick={() => {
                    setVoiceProvider(provider);
                    setGenderFilter('all');
                    setAccentFilter('all');
                    setSearchQuery('');
                  }}
                  className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    voiceProvider === provider
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {provider === 'elevenlabs' ? 'ElevenLabs' : provider.charAt(0).toUpperCase() + provider.slice(1)}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 border-b p-4">
              {/* Gender Filter */}
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="all">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>

              {/* Accent Filter */}
              <select
                value={accentFilter}
                onChange={(e) => setAccentFilter(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
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
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
            </div>

            {/* Content */}
            <div className="max-h-[500px] overflow-y-auto p-4">
              {loadingVoices ? (
                <div className="py-12 text-center text-muted-foreground">Loading voices...</div>
              ) : filteredVoices.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No voices found</div>
              ) : (
                <div className="space-y-4">
                  {/* Recommended Voices - first 4 */}
                  {filteredVoices.slice(0, 4).length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold">Recommended Voices</h3>
                      <div className="grid grid-cols-4 gap-3">
                        {filteredVoices.slice(0, 4).map((voice) => (
                          <div
                            key={voice.voice_id}
                            onClick={() => handleVoiceSelect(voice)}
                            className={`cursor-pointer rounded-lg border p-3 transition-all hover:border-primary ${
                              selectedVoice === voice.voice_id ? 'border-primary bg-primary/5' : ''
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-sm font-medium">{voice.voice_name}</div>
                              {voice.preview_audio_url && (
                                <button
                                  onClick={(e) => handlePlayVoice(voice.voice_id, voice.preview_audio_url, e)}
                                  className="text-primary hover:text-primary/80"
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
                    <div className="mb-2 grid grid-cols-12 gap-4 border-b pb-2 text-xs font-semibold text-muted-foreground">
                      <div className="col-span-4">Voice</div>
                      <div className="col-span-4">Trait</div>
                      <div className="col-span-4">Voice ID</div>
                    </div>
                    <div className="space-y-1">
                      {filteredVoices.map((voice) => (
                        <div
                          key={voice.voice_id}
                          onClick={() => handleVoiceSelect(voice)}
                          className={`grid cursor-pointer grid-cols-12 gap-4 rounded-lg p-3 transition-colors hover:bg-muted ${
                            selectedVoice === voice.voice_id ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="col-span-4 flex items-center gap-2">
                            {voice.preview_audio_url && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  new Audio(voice.preview_audio_url).play();
                                }}
                                className="text-primary hover:text-primary/80"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
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
    </div>
  );
}
