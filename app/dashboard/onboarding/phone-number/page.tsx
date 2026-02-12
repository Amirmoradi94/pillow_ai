'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneCall, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function PhoneNumberOnboardingPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [numberProvider, setNumberProvider] = useState<'twilio' | 'telnyx'>('twilio');
  const [tollFree, setTollFree] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importNumber, setImportNumber] = useState('');
  const [terminationUri, setTerminationUri] = useState('');
  const [sipUsername, setSipUsername] = useState('');
  const [sipPassword, setSipPassword] = useState('');
  const [importNickname, setImportNickname] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState('');
  const [deletingNumber, setDeletingNumber] = useState<string | null>(null);

  const fetchPhoneNumbers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/phone-numbers');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch phone numbers');
      }
      const data = await response.json();
      setPhoneNumbers(data.phoneNumbers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch phone numbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  const handlePurchase = async () => {
    if (!areaCode || areaCode.length !== 3) {
      setError('Please enter a valid 3-digit area code.');
      return;
    }

    setPurchasing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaCode,
          nickname: nickname || `Phone (${areaCode})`,
          numberProvider,
          tollFree,
          countryCode: 'US',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 402) {
          throw new Error('Retell requires a card on file to purchase numbers. Add payment in Retell billing.');
        }
        throw new Error(data.error || 'Failed to purchase phone number');
      }

      setSuccess(`Purchased ${data.phoneNumber.phone_number}`);
      setAreaCode('');
      setNickname('');
      await fetchPhoneNumbers();
    } catch (err: any) {
      setError(err.message || 'Failed to purchase phone number');
    } finally {
      setPurchasing(false);
    }
  };

  const handleImportCheck = async () => {
    if (!importNumber.trim()) {
      setError('Please enter a phone number in E.164 format (e.g., +14155550123).');
      return;
    }
    if (!terminationUri.trim()) {
      setError('Please enter your SIP termination URI.');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/phone-numbers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: importNumber.trim(),
          terminationUri: terminationUri.trim(),
          sipTrunkAuthUsername: sipUsername.trim() || undefined,
          sipTrunkAuthPassword: sipPassword || undefined,
          nickname: importNickname.trim() || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import phone number');
      }

      setSuccess(`Imported ${data.phoneNumber.phone_number}. You can bind it during agent creation.`);
      setImportNumber('');
      setTerminationUri('');
      setSipUsername('');
      setSipPassword('');
      setImportNickname('');
      await fetchPhoneNumbers();
    } catch (err: any) {
      setError(err.message || 'Failed to import phone number');
    } finally {
      setImporting(false);
    }
  };

  const handleStartEdit = (phone: any) => {
    setEditingNumber(phone.phone_number);
    setEditingNickname(phone.nickname || '');
  };

  const handleCancelEdit = () => {
    setEditingNumber(null);
    setEditingNickname('');
  };

  const handleSaveNickname = async () => {
    if (!editingNumber) return;
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/phone-numbers/${encodeURIComponent(editingNumber)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: editingNickname }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update nickname');
      }
      setSuccess(`Updated ${data.phoneNumber.phone_number}`);
      setEditingNumber(null);
      setEditingNickname('');
      await fetchPhoneNumbers();
    } catch (err: any) {
      setError(err.message || 'Failed to update nickname');
    }
  };

  const handleDeleteNumber = async (phoneNumber: string) => {
    const confirmed = window.confirm(`Delete ${phoneNumber}? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingNumber(phoneNumber);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/phone-numbers/${encodeURIComponent(phoneNumber)}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete phone number');
      }
      setSuccess(`Deleted ${phoneNumber}`);
      await fetchPhoneNumbers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete phone number');
    } finally {
      setDeletingNumber(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Phone Number Setup</h1>
          <p className="mt-2 text-muted-foreground">
            Add a phone number to handle inbound and outbound calls. You can buy a new number
            here or import your own number in Retell and refresh the list.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Available Phone Numbers</h2>
                <p className="text-sm text-muted-foreground">
                  Select one during agent creation.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchPhoneNumbers} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {phoneNumbers.length === 0 && !loading && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No phone numbers yet. Purchase one below or import your own in Retell.
              </div>
            )}

            {phoneNumbers.map((phone) => (
              <div key={phone.phone_number} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{phone.phone_number}</div>
                    {editingNumber === phone.phone_number ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input
                          value={editingNickname}
                          onChange={(e) => setEditingNickname(e.target.value)}
                          placeholder="Nickname"
                          className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <Button size="sm" onClick={handleSaveNickname}>Save</Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {phone.nickname || 'No nickname'}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>Inbound: {phone.inbound_agent_id ? 'Bound' : 'Not bound'}</div>
                    <div>Outbound: {phone.outbound_agent_id ? 'Bound' : 'Not bound'}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleStartEdit(phone)}>
                    Edit Nickname
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteNumber(phone.phone_number)}
                    disabled={deletingNumber === phone.phone_number}
                  >
                    {deletingNumber === phone.phone_number ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Purchase a New Number</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a 3-digit area code. This number will be ready for inbound and outbound once
            it is bound to an agent during creation.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Area Code</label>
              <input
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="415"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                If you see “No phone numbers of this area code”, try a different code (e.g., 415, 212, 647) or switch provider.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Nickname (Optional)</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Sales Line"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Provider</label>
              <select
                value={numberProvider}
                onChange={(e) => setNumberProvider(e.target.value as 'twilio' | 'telnyx')}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="twilio">Twilio</option>
                <option value="telnyx">Telnyx</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <input
                id="toll-free"
                type="checkbox"
                checked={tollFree}
                onChange={(e) => setTollFree(e.target.checked)}
              />
              <label htmlFor="toll-free" className="text-sm">Toll-free</label>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handlePurchase} disabled={purchasing || areaCode.length !== 3}>
              {purchasing ? 'Purchasing...' : 'Purchase Number'}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Bring Your Own Number</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Import your number via SIP trunking without leaving Pillow. We will register it in Retell
            and you can bind it during agent creation.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Phone Number (E.164)</label>
              <input
                value={importNumber}
                onChange={(e) => setImportNumber(e.target.value)}
                placeholder="+14155550123"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">SIP Termination URI</label>
              <input
                value={terminationUri}
                onChange={(e) => setTerminationUri(e.target.value)}
                placeholder="sip:example.sip.provider.com"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">SIP Username (Optional)</label>
              <input
                value={sipUsername}
                onChange={(e) => setSipUsername(e.target.value)}
                placeholder="username"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">SIP Password (Optional)</label>
              <input
                type="password"
                value={sipPassword}
                onChange={(e) => setSipPassword(e.target.value)}
                placeholder="password"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Nickname (Optional)</label>
              <input
                value={importNickname}
                onChange={(e) => setImportNickname(e.target.value)}
                placeholder="Sales Line"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleImportCheck} disabled={importing}>
              {importing ? 'Importing...' : 'Import Number'}
            </Button>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Then go to <Link className="underline" href="/dashboard/agents/new">Create Agent</Link> and bind the number.
          </div>
        </div>
      </div>
    </div>
  );
}
