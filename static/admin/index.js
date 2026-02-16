import React, { useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import { createRoot } from 'react-dom/client';
import '@atlaskit/css-reset';
import DnaAnimation from './DnaAnimation';

// Enable Confluence Theme Sync
view.theme.enable();

const Toggle = ({ checked, onChange }) => (
    <div 
        onClick={() => onChange({ target: { checked: !checked } })}
        style={{
            width: '44px',
            height: '24px',
            backgroundColor: checked ? '#36b37e' : '#d1d5db',
            borderRadius: '12px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            flexShrink: 0,
            userSelect: 'none'
        }}
    >
        <div style={{
            width: '18px',
            height: '18px',
            backgroundColor: 'white',
            borderRadius: '50%',
            position: 'absolute',
            top: '3px',
            left: checked ? '23px' : '3px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
    </div>
);

const Chart = ({ data, selectedType, onSelect }) => {
    const entries = Object.entries(data).filter(([_, val]) => val > 0);
    if (entries.length === 0) return (
        <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b778c', border: '1px dashed #dfe1e6', borderRadius: '8px' }}>
            No sensitive data patterns found yet.
        </div>
    );

    const maxVal = Math.max(...entries.map(e => e[1]), 1);
    const chartWidth = 600;
    const barHeight = 35;
    const gap = 12;

    return (
        <div style={{ marginTop: '15px' }}>
            <svg width="100%" viewBox={`0 0 ${chartWidth} ${entries.length * (barHeight + gap)}`} style={{ overflow: 'visible' }}>
                {entries.map(([key, val], i) => {
                    const isSelected = selectedType === key;
                    const width = (val / maxVal) * (chartWidth - 150);
                    return (
                        <g key={key} transform={`translate(0, ${i * (barHeight + gap)})`} 
                           style={{ cursor: 'pointer' }} onClick={() => onSelect(isSelected ? null : key)}>
                            <text x="0" y={barHeight / 1.5} fontSize="13" fontWeight="600" fill={isSelected ? '#0052cc' : '#172b4d'}>
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                            </text>
                            <rect 
                                x="120" 
                                y="0" 
                                width={width} 
                                height={barHeight} 
                                fill={isSelected ? '#36b37e' : '#ebecf0'} 
                                rx="4"
                                style={{ transition: 'all 0.3s ease' }}
                            />
                            <text x={130 + width} y={barHeight / 1.5} fontSize="14" fontWeight="bold" fill="#172b4d">
                                {val}
                            </text>
                        </g>
                    );
                })}
            </svg>
            {selectedType && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#0052cc', fontWeight: '500' }}>
                    💡 Showing breakdown for {selectedType.toUpperCase()}
                </div>
            )}
        </div>
    );
};

const App = () => {
    const [settings, setSettings] = useState(null);
    const [version, setVersion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanResults, setScanResults] = useState(null);
    const [selectedMetric, setSelectedMetric] = useState(null);

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

    const runFullScan = async () => {
        setScanning(true);
        setScanProgress(0);
        try {
            const { totalPages } = await invoke('getSiteStats');
            if (totalPages === 0) {
                setScanResults({ active: 0, quarantined: 0, hitsByType: {} });
                return;
            }

            let aggregatedHits = {};
            let activeCount = 0;
            let quarantinedCount = 0;
            const batchSize = 10;

            for (let i = 0; i < totalPages; i += batchSize) {
                const results = await invoke('scanSiteBatch', { start: i, limit: batchSize });
                
                activeCount += results.stats.active;
                quarantinedCount += results.stats.quarantined;
                
                Object.entries(results.stats.hitsByType).forEach(([type, count]) => {
                    aggregatedHits[type] = (aggregatedHits[type] || 0) + count;
                });

                setScanProgress(Math.min(100, Math.round(((i + batchSize) / totalPages) * 100)));
            }

            setScanResults({
                active: activeCount,
                quarantined: quarantinedCount,
                hitsByType: aggregatedHits,
                total: totalPages
            });
        } catch (e) {
            console.error("Scan failed", e);
            alert("Analysis failed to complete.");
        } finally {
            setScanning(false);
        }
    };

    if (loading) return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Loading settings...</div>;

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', color: 'var(--ds-text, #172b4d)' }}>
            <div style={{ marginBottom: '20px' }}>
                 <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--ds-text, #172b4d)' }}>🛡️ Content Governance & Privacy</h1>
                 <p style={{ margin: '8px 0 0 0', color: 'var(--ds-text-subtle, #6b778c)', fontSize: '14px' }}>Advanced Data Security & Institutional Safeguards</p>
            </div>

            <DnaAnimation />

            {/* Analysis Dashboard */}
            <div style={{
                backgroundColor: 'var(--ds-surface-raised, white)',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                marginBottom: '30px',
                border: '1px solid var(--ds-border, #dfe1e6)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '20px' }}>Data Privacy Dashboard</h3>
                        <p style={{ margin: '4px 0 0 0', color: '#6b778c', fontSize: '13px' }}>Institutional analysis of sensitive data distribution</p>
                    </div>
                    <button 
                        onClick={runFullScan}
                        disabled={scanning}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: scanning ? '#f4f5f7' : '#0052cc',
                            color: scanning ? '#a5adba' : 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: scanning ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {scanning ? `Analyzing (${scanProgress}%)...` : '🔍 Run Site Analysis'}
                    </button>
                </div>

                {scanning && (
                    <div style={{ height: '6px', width: '100%', backgroundColor: '#ebecf0', borderRadius: '3px', marginBottom: '20px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${scanProgress}%`, backgroundColor: '#4c9aff', transition: 'width 0.3s ease' }} />
                    </div>
                )}

                {scanResults ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '12px', color: '#6b778c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Content Status</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#e3fcef', borderRadius: '6px' }}>
                                        <span style={{ fontWeight: '600', color: '#006644' }}>Active Pages</span>
                                        <span style={{ fontWeight: 'bold' }}>{scanResults.active}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#fffae6', borderRadius: '6px' }}>
                                        <span style={{ fontWeight: '600', color: '#825c00' }}>In Quarantine</span>
                                        <span style={{ fontWeight: 'bold' }}>{scanResults.quarantined}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '15px', backgroundColor: '#f4f5f7', borderRadius: '8px', fontSize: '13px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Summary</div>
                                Identified {Object.values(scanResults.hitsByType).reduce((a, b) => a + b, 0)} potential risk points across {scanResults.total} pages.
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b778c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Incident Distribution</div>
                            <Chart 
                                data={scanResults.hitsByType} 
                                selectedType={selectedMetric} 
                                onSelect={setSelectedMetric} 
                            />
                        </div>
                    </div>
                ) : !scanning && (
                    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fafbfc', borderRadius: '8px', border: '2px dashed #dfe1e6' }}>
                        <div style={{ fontSize: '30px', marginBottom: '10px' }}>📊</div>
                        <div style={{ fontWeight: '600', color: '#172b4d' }}>No scan data available</div>
                        <div style={{ fontSize: '13px', color: '#6b778c', marginTop: '4px' }}>Launch a full-site analysis to visualize your data exposure.</div>
                    </div>
                )}
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Data Detection Profiles</h2>
            </div>

            <p style={{ color: 'var(--ds-text-subtle, #6b778c)' }}>Configure which sensitive data patterns should be monitored across your Confluence instance.</p>

            <div style={{
                marginTop: '20px',
                backgroundColor: 'var(--ds-surface-raised, white)',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: 'var(--ds-shadow-raised, 0 1px 3px rgba(0,0,0,0.1))',
                color: 'var(--ds-text, #172b4d)'
            }}>
                <h4 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--ds-text, #172b4d)' }}>Detection Rules</h4>
                {Object.keys(settings).filter(k => !['regulatedGroupName', 'enableQuarantine', 'enableHistoricalScan', 'clearanceLevels', 'regulatedGroups'].includes(k)).map((key) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--ds-text, #172b4d)', gap: '12px' }}>
                            <Toggle
                                checked={settings[key]}
                                onChange={(e) => handleChange(key, e.target.checked)}
                            />
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>
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
                <h3 style={{ marginTop: 0, color: 'var(--ds-text, #172b4d)' }}>Automated Response Actions</h3>
                <p style={{ fontSize: '14px', color: 'var(--ds-text-subtle, #6b778c)', marginBottom: '20px' }}>
                    Define how the system should respond when sensitive information is identified.
                </p>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '16px' }}>
                        <Toggle
                            checked={settings.enableQuarantine || false}
                            onChange={(e) => handleChange('enableQuarantine', e.target.checked)}
                        />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                Auto-Quarantine Pages
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--ds-text-subtle, #6b778c)' }}>
                                Automatically restrict page access when sensitive data is flagged. Only the author will be able to view and edit.
                            </div>
                        </div>
                    </label>
                </div>

                <div style={{ marginBottom: '0' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '16px' }}>
                        <Toggle
                            checked={settings.enableHistoricalScan || false}
                            onChange={(e) => handleChange('enableHistoricalScan', e.target.checked)}
                        />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                Scan Historical Versions
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--ds-text-subtle, #6b778c)' }}>
                                Scan the last 10 versions of each page for sensitive information. May impact performance for pages with many revisions.
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
                <h3 style={{ marginTop: 0, color: 'var(--ds-text, #172b4d)' }}>Security Clearance Levels</h3>
                <p style={{ fontSize: '14px', color: 'var(--ds-text-subtle, #6b778c)', marginBottom: '20px' }}>
                    Manage security clearance levels and assign groups to each level. Pages with classification keywords will be automatically labeled.
                </p>
                
                {(settings.clearanceLevels || []).map((level, levelIndex) => (
                    <div key={level.id} style={{
                        marginBottom: '20px',
                        padding: '15px',
                        border: '2px solid var(--ds-border, #dfe1e6)',
                        borderRadius: '8px',
                        backgroundColor: level.rank === 5 ? '#fff3cd' : level.rank === 4 ? '#f8d7da' : level.rank === 3 ? '#d1ecf1' : level.rank === 2 ? '#e2e3e5' : '#d4edda'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px'
                        }}>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--ds-text, #172b4d)' }}>
                                {level.name}
                            </div>
                            <div style={{ 
                                fontSize: '11px',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                background: 
                                    level.rank === 5 ? 'linear-gradient(135deg, #F9D423 0%, #FF4E50 100%)' : // Top Secret
                                    level.rank === 4 ? 'linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%)' : // Secret
                                    level.rank === 3 ? 'linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)' : // Confidential
                                    level.rank === 2 ? 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)' : // Internal
                                    'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)', // Unclassified
                                color: 'white',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}>
                                Rank: {level.rank}
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: 'var(--ds-text, #172b4d)' }}>
                                Authorized Groups:
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                {(level.groups || []).map((group, gIndex) => (
                                    <div key={gIndex} style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        backgroundColor: '#0052cc',
                                        color: 'white',
                                        borderRadius: '16px',
                                        padding: '4px 12px',
                                        fontSize: '13px',
                                        fontWeight: 500
                                    }}>
                                        {group}
                                        <span 
                                            onClick={() => {
                                                const newLevels = [...settings.clearanceLevels];
                                                newLevels[levelIndex].groups = newLevels[levelIndex].groups.filter((_, i) => i !== gIndex);
                                                handleChange('clearanceLevels', newLevels);
                                            }}
                                            style={{
                                                marginLeft: '8px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                opacity: 0.8
                                            }}
                                            onMouseEnter={(e) => e.target.style.opacity = 1}
                                            onMouseLeave={(e) => e.target.style.opacity = 0.8}
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
                                            const newLevels = [...settings.clearanceLevels];
                                            if (!newLevels[levelIndex].groups.includes(val)) {
                                                newLevels[levelIndex].groups = [...newLevels[levelIndex].groups, val];
                                                handleChange('clearanceLevels', newLevels);
                                            }
                                            e.target.value = '';
                                        }
                                    }
                                }}
                                style={{
                                    padding: '8px 12px',
                                    width: '100%',
                                    maxWidth: '600px',
                                    boxSizing: 'border-box',
                                    borderRadius: '4px',
                                    border: '1px solid var(--ds-border, #dfe1e6)',
                                    fontSize: '13px',
                                    backgroundColor: 'var(--ds-background-input, white)',
                                    color: 'var(--ds-text, #172b4d)'
                                }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', color: 'var(--ds-text, #172b4d)' }}>
                                Detection Keywords:
                            </label>
                            <div style={{ 
                                fontSize: '12px', 
                                color: 'var(--ds-text-subtle, #6b778c)',
                                fontFamily: 'monospace',
                                backgroundColor: 'rgba(255,255,255,0.5)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                wordBreak: 'break-all',
                                flex: 1,
                                border: '1px dashed rgba(0,0,0,0.1)'
                            }}>
                                {level.keywords.join(', ')}
                            </div>
                        </div>
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
                    Data Security Suite v{version.version}
                </div>
            )}
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
