import React, { useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import { createRoot } from 'react-dom/client';
import '@atlaskit/css-reset';
import DnaAnimation from './DnaAnimation';

// Enable Confluence Theme Sync
view.theme.enable();

const App = () => {
    const [settings, setSettings] = useState(null);
    const [version, setVersion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        Promise.all([
            invoke('getSettings'),
            invoke('getVersion')
        ]).then(([settingsData, versionData]) => {
            setSettings(settingsData || {});
            setVersion(versionData);
            setLoading(false);
        });
    }, []);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setSaved(false); // Reset saved indicator on change
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await invoke('saveSettings', settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000); // Hide success after 3s
        } catch (e) {
            console.error("Failed to save", e);
            alert("Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Loading settings...</div>;

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', color: 'var(--ds-text, #172b4d)' }}>
            <div style={{ marginBottom: '20px' }}>
                 <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--ds-text, #172b4d)' }}>🛡️ PII Protection</h1>
                 <p style={{ margin: '8px 0 0 0', color: 'var(--ds-text-subtle, #6b778c)', fontSize: '14px' }}>Advanced Data Security & Privacy</p>
            </div>

            <DnaAnimation />

            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>PII Types</h2>
            </div>

            <p style={{ color: 'var(--ds-text-subtle, #6b778c)' }}>Select which types of Personally Identifiable Information (PII) should be detected.</p>

            <div style={{
                marginTop: '20px',
                backgroundColor: 'var(--ds-surface-raised, white)',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: 'var(--ds-shadow-raised, 0 1px 3px rgba(0,0,0,0.1))',
                color: 'var(--ds-text, #172b4d)'
            }}>
                <h4 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--ds-text, #172b4d)' }}>Detection Rules</h4>
                {Object.keys(settings).filter(k => k !== 'regulatedGroupName').map((key) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--ds-text, #172b4d)' }}>
                            <input
                                type="checkbox"
                                checked={settings[key]}
                                onChange={(e) => handleChange(key, e.target.checked)}
                                style={{ marginRight: '10px', width: '16px', height: '16px', accentColor: 'var(--ds-background-selected, #0052cc)' }}
                            />
                            <span style={{ fontSize: '14px' }}>
                                {key === 'driversLicense' ? "Driver's License" : key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                        </label>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: '20px',
                backgroundColor: 'var(--ds-surface-raised, white)',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: 'var(--ds-shadow-raised, 0 1px 3px rgba(0,0,0,0.1))',
                color: 'var(--ds-text, #172b4d)'
            }}>
                <h3 style={{ marginTop: 0, color: 'var(--ds-text, #172b4d)' }}>Protection Actions</h3>
                <p style={{ fontSize: '14px', color: 'var(--ds-text-subtle, #6b778c)', marginBottom: '20px' }}>
                    Configure automated actions when PII is detected.
                </p>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.enableQuarantine || false}
                            onChange={(e) => handleChange('enableQuarantine', e.target.checked)}
                            style={{ 
                                marginRight: '12px', 
                                marginTop: '2px',
                                width: '18px', 
                                height: '18px', 
                                accentColor: 'var(--ds-background-selected, #0052cc)',
                                cursor: 'pointer'
                            }}
                        />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                Auto-Quarantine Pages
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--ds-text-subtle, #6b778c)' }}>
                                Automatically restrict page access when PII is detected. Only the author will be able to view and edit.
                            </div>
                        </div>
                    </label>
                </div>

                <div style={{ marginBottom: '0' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.enableHistoricalScan || false}
                            onChange={(e) => handleChange('enableHistoricalScan', e.target.checked)}
                            style={{ 
                                marginRight: '12px', 
                                marginTop: '2px',
                                width: '18px', 
                                height: '18px', 
                                accentColor: 'var(--ds-background-selected, #0052cc)',
                                cursor: 'pointer'
                            }}
                        />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                Scan Historical Versions
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--ds-text-subtle, #6b778c)' }}>
                                Scan the last 10 versions of each page for PII. May impact performance for pages with many revisions.
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            <div style={{
                marginTop: '20px',
                backgroundColor: 'var(--ds-surface-raised, white)',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: 'var(--ds-shadow-raised, 0 1px 3px rgba(0,0,0,0.1))',
                color: 'var(--ds-text, #172b4d)'
            }}>
                <h3 style={{ marginTop: 0, color: 'var(--ds-text, #172b4d)' }}>Regulated User Controls</h3>
                <p style={{ fontSize: '14px', color: 'var(--ds-text-subtle, #6b778c)' }}>
                    Users in these groups will be blocked from using @mentions and editing comments.
                </p>

                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: 'var(--ds-text, #172b4d)' }}>Regulated Groups:</label>
                
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '8px',
                    padding: '4px 0'
                }}>
                    {(settings.regulatedGroups || (settings.regulatedGroupName ? [settings.regulatedGroupName] : [])).map((group, index) => (
                        <div key={index} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            backgroundColor: '#e3f2fd',
                            color: '#0052cc',
                            borderRadius: '16px',
                            padding: '4px 12px',
                            fontSize: '14px',
                            fontWeight: 500,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            cursor: 'grab' // Hint at draggable nature (visual only for now)
                        }}>
                            {group}
                            <span 
                                onClick={() => {
                                    const currentGroups = settings.regulatedGroups || (settings.regulatedGroupName ? [settings.regulatedGroupName] : []);
                                    handleChange('regulatedGroups', currentGroups.filter((_, i) => i !== index));
                                }}
                                style={{
                                    marginLeft: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    color: '#0052cc',
                                    opacity: 0.7
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = 1}
                                onMouseLeave={(e) => e.target.style.opacity = 0.7}
                            >
                                ×
                            </span>
                        </div>
                    ))}
                </div>

                <input
                    type="text"
                    placeholder="Type group name and press Enter..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.target.value.trim();
                            if (val) {
                                const currentGroups = settings.regulatedGroups || (settings.regulatedGroupName ? [settings.regulatedGroupName] : []);
                                if (!currentGroups.includes(val)) {
                                    handleChange('regulatedGroups', [...currentGroups, val]);
                                }
                                e.target.value = '';
                            }
                        }
                    }}
                    style={{
                        padding: '10px',
                        width: '100%',
                        maxWidth: '400px',
                        boxSizing: 'border-box',
                        fontSize: '14px',
                        borderRadius: '4px',
                        border: '1px solid var(--ds-border-input, #dfe1e6)',
                        backgroundColor: 'var(--ds-background-input, #fafbfc)',
                        color: 'var(--ds-text, #172b4d)'
                    }}
                />
            </div>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: saved ? '#36b37e' : '#0052cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                >
                    {saving ? 'Saving...' : saved ? '✅ Saved Successfully' : 'Save Settings'}
                </button>
            </div>

            {version && (
                <div style={{ 
                    marginTop: '40px', 
                    paddingTop: '20px', 
                    borderTop: '1px solid var(--ds-border, #dfe1e6)',
                    textAlign: 'center',
                    color: 'var(--ds-text-subtle, #6b778c)',
                    fontSize: '12px'
                }}>
                    PII Protection v{version.version}
                </div>
            )}
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
