'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Palette, Image as ImageIcon, Globe, Save, Upload } from 'lucide-react';

interface BrandConfig {
  logo_url?: string;
  primary_color?: string;
  company_name?: string;
  subdomain?: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<BrandConfig>({
    primary_color: '#2563eb',
    company_name: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchBrandConfig();
  }, []);

  const fetchBrandConfig = async () => {
    try {
      // This would fetch the tenant's brand config
      await new Promise(resolve => setTimeout(resolve, 500));
      setConfig({
        primary_color: '#2563eb',
        company_name: 'My Business',
        logo_url: '',
        subdomain: '',
      });
    } catch (error) {
      console.error('Error fetching brand config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // In real implementation, upload to storage and get URL
      setConfig({ ...config, logo_url: URL.createObjectURL(file) });
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      // This would save the brand config to the tenant record
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Brand settings saved successfully!');
    } catch (error) {
      console.error('Error saving brand config:', error);
      alert('Failed to save brand settings');
    } finally {
      setSaving(false);
    }
  };

  const colorOptions = [
    { name: 'Blue', value: '#2563eb' },
    { name: 'Green', value: '#059669' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Pink', value: '#db2777' },
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Teal', value: '#0d9488' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Customize your dashboard and brand</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Brand Colors */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Palette className="h-5 w-5" />
            Brand Colors
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Primary Color
              </label>
              <div className="flex gap-2 flex-wrap mb-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setConfig({ ...config, primary_color: color.value })}
                    className={`h-10 w-10 rounded-full transition-transform hover:scale-110 ${
                      config.primary_color === color.value ? 'ring-2 ring-offset-2 ring-foreground' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={config.primary_color || '#2563eb'}
                  onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                  className="h-10 w-16 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.primary_color || ''}
                  onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                  className="flex-1 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="#2563eb"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo & Branding */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ImageIcon className="h-5 w-5" />
            Logo & Branding
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={config.company_name || ''}
                onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                {config.logo_url ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-lg border bg-muted">
                    <img
                      src={config.logo_url}
                      alt="Company Logo"
                      className="h-full w-full object-contain"
                    />
                    <button
                      onClick={() => setConfig({ ...config, logo_url: '' })}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2 hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </div>
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Recommended: PNG or SVG, minimum 200x200px, max 2MB
              </p>
            </div>
          </div>
        </div>

        {/* Subdomain */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Globe className="h-5 w-5" />
            Custom Subdomain
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Subdomain
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={config.subdomain || ''}
                  onChange={(e) => setConfig({ ...config, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="flex-1 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="your-company"
                />
                <span className="text-muted-foreground">.pillow.ai</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Only lowercase letters, numbers, and hyphens allowed
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm">
                <strong>Preview:</strong>{' '}
                <span className="text-primary">
                  {config.subdomain || 'your-company'}.pillow.ai
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Brand Preview</h2>
          <div className="space-y-4">
            <div
              className="rounded-lg border p-4"
              style={{ borderColor: config.primary_color + '40' }}
            >
              <div className="flex items-center gap-3 mb-4">
                {config.logo_url ? (
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    className="h-10 w-10 rounded object-contain"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold"
                    style={{ backgroundColor: config.primary_color }}
                  >
                    {config.company_name?.charAt(0) || 'P'}
                  </div>
                )}
                <div>
                  <p
                    className="font-semibold"
                    style={{ color: config.primary_color }}
                  >
                    {config.company_name || 'Your Company'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {config.subdomain ? `${config.subdomain}.pillow.ai` : 'dashboard.pillow.ai'}
                  </p>
                </div>
              </div>
              <button
                className="w-full rounded-lg py-2 text-white font-medium"
                style={{ backgroundColor: config.primary_color }}
              >
                Sign In
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              This preview shows how your branding will appear to your users
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSaveConfig} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
