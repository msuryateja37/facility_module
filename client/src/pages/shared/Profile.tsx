import React, { useState } from 'react';
import { User, Mail, Award, Landmark, Check, Phone, AlertCircle, MapPin } from 'lucide-react';
import { updateProfile } from '../../utils/api';

interface ProfileProps {
  user: any;
  activeRole: string;
  onProfileUpdate?: (user: any) => void;
}

export default function Profile({ user, activeRole, onProfileUpdate }: ProfileProps) {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phoneNumber || '');
  const [office, setOffice] = useState(user.officeLocation || 'DLRRD Pretoria Head Office, 184 Jeff Masemola Street');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);

    try {
      const data = await updateProfile(user.username, {
        firstName,
        lastName,
        email,
        phoneNumber: phone,
        officeLocation: office
      });

      if (data.success) {
        setSaved(true);
        if (onProfileUpdate) {
          onProfileUpdate(data.user);
        }
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.message || 'Failed to update user profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>My Profile</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Manage your personal details and view credentials.
        </p>
      </div>

      <div className="grid-cols-3">
        {/* Left Card: Summary */}
        <div className="card" style={{ gridColumn: 'span 1', textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            border: '2px solid var(--color-accent)'
          }}>
            <User size={48} />
          </div>

          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{firstName} {lastName}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            {user.designation}
          </p>

          <hr style={{ border: '0', borderTop: '1px solid var(--color-border)', marginBottom: '1.5rem' }} />

          <div style={{ textAlign: 'left', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Landmark size={18} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Department</div>
                <div>{user.department}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Award size={18} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Active Role</div>
                <div className="badge badge-verified" style={{ marginTop: '0.25rem' }}>
                  {getRoleLabel(activeRole)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <MapPin size={18} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Province Vault</div>
                <div>{user.province || 'Gauteng'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Mail size={18} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Email</div>
                <div style={{ wordBreak: 'break-all' }}>{email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Phone size={18} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Contact Number</div>
                <div>{phone}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Form Details */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            Account Settings
          </h3>

          <form onSubmit={handleSave}>
            {saved && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#dcfce7',
                border: '1px solid #bbf7d0',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                color: '#15803d',
                fontSize: '0.875rem',
                marginBottom: '1.25rem'
              }}>
                <Check size={18} style={{ flexShrink: 0 }} />
                <span>Profile updated successfully!</span>
              </div>
            )}

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                color: '#b91c1c',
                fontSize: '0.875rem',
                marginBottom: '1.25rem'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="grid-cols-2" style={{ marginBottom: '1.25rem' }}>
              <div>
                <label htmlFor="first-name">First Name</label>
                <input
                  id="first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="last-name">Last Name</label>
                <input
                  id="last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-cols-2" style={{ marginBottom: '1.25rem' }}>
              <div>
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="phone">Contact Number</label>
                <input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="office">Office Location</label>
              <input
                id="office"
                type="text"
                value={office}
                onChange={(e) => setOffice(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="province">Assigned Province Vault</label>
              <input
                id="province"
                type="text"
                value={user.province || 'Gauteng'}
                disabled
                style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label>System Credentials Scope</label>
              <div style={{
                backgroundColor: 'var(--color-primary-light)',
                border: '1px solid var(--color-sage-light)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                fontSize: '0.8125rem',
                color: 'var(--color-primary-dark)'
              }}>
                {user?.assignedRole === 'sys_admin' ? (
                  <>
                    <strong>Master Administrator Status:</strong> Your credentials are authorized to switch dynamically across all system roles including SAC Admin Clerk, Supervisor (SAO/ASD), Deputy Director, Director, Internal Control, Financial Department, and System Administrator.
                  </>
                ) : (
                  <>
                    <strong>Role-Based Access Lock:</strong> Under DLRRD security protocol, your profile is locked to the <strong>{getRoleLabel(activeRole)}</strong> workspace. You are not permitted to switch or view other operational departments.
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
