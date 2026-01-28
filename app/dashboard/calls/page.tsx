'use client';

import { useState, useEffect } from 'react';
import { PhoneCall, Clock, Play, Download } from 'lucide-react';

interface Call {
  id: string;
  phone_number: string;
  duration: number;
  status: 'completed' | 'missed' | 'failed';
  transcript?: string;
  recording_url?: string;
  created_at: string;
  voice_agents?: {
    name: string;
  };
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'missed' | 'failed'>('all');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  useEffect(() => {
    fetchCalls();
  }, [filter]);

  const fetchCalls = async () => {
    try {
      const url = filter === 'all' ? '/api/calls' : `/api/calls?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      setCalls(data.calls || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'missed':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Call History</h1>
        <p className="text-muted-foreground">View and manage all your call logs</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All Calls
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('missed')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'missed'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Missed
        </button>
        <button
          onClick={() => setFilter('failed')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'failed'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Failed
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : calls.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <PhoneCall className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No calls yet</h3>
          <p className="mt-2 text-muted-foreground">
            Calls will appear here once your agents start receiving calls
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Phone Number</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Agent</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Duration</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {calls.map((call) => (
                <tr key={call.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium">{call.phone_number}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {call.voice_agents?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {Math.floor(call.duration / 60)}m {call.duration % 60}s
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                        call.status
                      )}`}
                    >
                      {call.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(call.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="rounded-lg p-2 hover:bg-muted transition-colors"
                        title="View transcript"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      {call.recording_url && (
                        <button
                          onClick={() => window.open(call.recording_url, '_blank')}
                          className="rounded-lg p-2 hover:bg-muted transition-colors"
                          title="Download recording"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Call Detail Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Call Details</h2>
              <button
                onClick={() => setSelectedCall(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium">{selectedCall.phone_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">
                  {Math.floor(selectedCall.duration / 60)}m {selectedCall.duration % 60}s
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                    selectedCall.status
                  )}`}
                >
                  {selectedCall.status}
                </span>
              </div>
              {selectedCall.transcript && (
                <div>
                  <p className="text-sm text-muted-foreground">Transcript</p>
                  <div className="mt-2 rounded-lg border bg-muted/50 p-4">
                    <p className="whitespace-pre-wrap text-sm">{selectedCall.transcript}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {new Date(selectedCall.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
