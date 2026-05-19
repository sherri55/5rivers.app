import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth';
import { Badge } from '@/components/ui/Badge';
import { useOrganization, useUpdateOrganizationSettings } from '@/hooks/useOrganization';
import { useToast } from '@/context/toast';

// ============================================
// Settings Page — Organization, User, Security
// sections with asymmetric grid layout
// ============================================

export function SettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Org data from API
  const { data: org } = useOrganization();
  const updateSettings = useUpdateOrganizationSettings();

  // Placeholder state for user profile
  const [userName, setUserName] = useState(user?.name ?? '');

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // PDF company info state
  const [pdfName, setPdfName] = useState('');
  const [pdfAddress, setPdfAddress] = useState('');
  const [pdfPhone, setPdfPhone] = useState('');
  const [pdfEmail, setPdfEmail] = useState('');
  const [pdfHst, setPdfHst] = useState('');

  // Populate PDF fields when org data loads
  useEffect(() => {
    if (!org?.settings?.pdfCompany) return;
    const p = org.settings.pdfCompany;
    setPdfName(p.name ?? '');
    setPdfAddress(p.address ?? '');
    setPdfPhone(p.phone ?? '');
    setPdfEmail(p.email ?? '');
    setPdfHst(p.hst ?? '');
  }, [org]);

  async function handleSavePdf() {
    try {
      await updateSettings.mutateAsync({
        pdfCompany: {
          name: pdfName,
          address: pdfAddress,
          phone: pdfPhone,
          email: pdfEmail,
          hst: pdfHst,
        },
      });
      addToast('Invoice PDF settings saved', 'success');
    } catch {
      addToast('Failed to save settings', 'error');
    }
  }

  const canEdit = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
          Account
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
          Settings
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Manage your organization, profile, and security preferences.
        </p>
      </header>

      <div className="space-y-12">
        {/* Section 1: Organization Profile */}
        <div className="grid grid-cols-3 gap-12 items-start">
          <div>
            <h2 className="text-sm font-semibold text-on-surface">Organization</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Your organization identity and branding settings.
            </p>
          </div>
          <div className="col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
            <div className="space-y-6">
              <FormField label="Organization Name">
                <div className="bg-surface-container-highest/30 border border-outline-variant/20 rounded-lg px-4 py-3 text-sm text-slate-500 cursor-not-allowed">
                  {org?.name ?? '—'}
                </div>
              </FormField>

              <FormField label="Slug">
                <div className="bg-surface-container-highest/30 border border-outline-variant/20 rounded-lg px-4 py-3 text-sm text-slate-400 cursor-not-allowed">
                  {org?.slug ?? '—'}
                </div>
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 2: Invoice PDF Info */}
        <div className="grid grid-cols-3 gap-12 items-start">
          <div>
            <h2 className="text-sm font-semibold text-on-surface">Invoice PDF</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Company information printed in the header of every generated invoice PDF.
            </p>
          </div>
          <div className="col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
            <div className="space-y-6">
              <FormField label="Company Name">
                <input
                  type="text"
                  value={pdfName}
                  onChange={(e) => setPdfName(e.target.value)}
                  placeholder="e.g. 5 Rivers Trucking Inc."
                  disabled={!canEdit}
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </FormField>

              <FormField label="Address">
                <textarea
                  value={pdfAddress}
                  onChange={(e) => setPdfAddress(e.target.value)}
                  placeholder={"e.g. 140 Cherryhill Place\nLondon, Ontario\nN6H4M5"}
                  rows={3}
                  disabled={!canEdit}
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Phone">
                  <input
                    type="text"
                    value={pdfPhone}
                    onChange={(e) => setPdfPhone(e.target.value)}
                    placeholder="e.g. +1 (437) 679 9350"
                    disabled={!canEdit}
                    className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </FormField>

                <FormField label="Email">
                  <input
                    type="email"
                    value={pdfEmail}
                    onChange={(e) => setPdfEmail(e.target.value)}
                    placeholder="e.g. info@company.ca"
                    disabled={!canEdit}
                    className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </FormField>
              </div>

              <FormField label="HST Number">
                <input
                  type="text"
                  value={pdfHst}
                  onChange={(e) => setPdfHst(e.target.value)}
                  placeholder="e.g. 760059956"
                  disabled={!canEdit}
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </FormField>

              {canEdit && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSavePdf}
                    disabled={updateSettings.isPending}
                    className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {updateSettings.isPending ? 'hourglass_empty' : 'save'}
                    </span>
                    {updateSettings.isPending ? 'Saving…' : 'Save PDF Settings'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: User Account */}
        <div className="grid grid-cols-3 gap-12 items-start">
          <div>
            <h2 className="text-sm font-semibold text-on-surface">User Account</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Your personal information and account details.
            </p>
          </div>
          <div className="col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
            <div className="space-y-6">
              <FormField label="Full Name">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
              </FormField>

              <FormField label="Email Address">
                <div className="bg-surface-container-highest/30 border border-outline-variant/20 rounded-lg px-4 py-3 text-sm text-slate-400 cursor-not-allowed">
                  {user?.email ?? '—'}
                </div>
              </FormField>

              <FormField label="Role">
                <div className="pt-1">
                  <Badge variant={user?.role === 'OWNER' ? 'blue' : user?.role === 'ADMIN' ? 'indigo' : 'gray'}>
                    {user?.role ?? '—'}
                  </Badge>
                </div>
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 4: Security / Change Password */}
        <div className="grid grid-cols-3 gap-12 items-start">
          <div>
            <h2 className="text-sm font-semibold text-on-surface">Security</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Update your password to keep your account secure.
            </p>
          </div>
          <div className="col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
            <div className="space-y-6">
              <FormField label="Current Password">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
              </FormField>

              <FormField label="New Password">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
              </FormField>

              <FormField label="Confirm New Password">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
              </FormField>

              <div className="pt-2">
                <button
                  type="button"
                  className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  Update Credentials
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="grid grid-cols-3 gap-12 items-start">
          <div>
            <h2 className="text-sm font-semibold text-error">Danger Zone</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Irreversible actions that affect your account.
            </p>
          </div>
          <div className="col-span-2 bg-red-50/40 rounded-xl border-l-4 border-error p-8">
            <h3 className="text-sm font-semibold text-on-surface mb-2">
              Delete Account
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Once you delete your account, there is no going back. All your data
              will be permanently removed.
            </p>
            <button
              type="button"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-error hover:bg-error-container/20 transition-colors flex items-center gap-2 border border-error/30"
            >
              <span className="material-symbols-outlined text-[18px]">delete_forever</span>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Reusable form field wrapper ---

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}
