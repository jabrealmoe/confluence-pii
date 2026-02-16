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

const ClearanceLevel = ({ level, levelIndex, settings, handleChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div key={level.id} style={{
            marginBottom: '12px',
            border: '1px solid #dfe1e6',
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    padding: '12px 16px',
                    backgroundColor: level.rank === 5 ? '#fff9db' : level.rank === 4 ? '#fff5f5' : '#f8f9fa',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#172b4d' }}>{level.name}</span>
                    <span style={{ 
                        fontSize: '10px', 
                        fontWeight: '800', 
                        background: level.rank >= 4 ? '#de350b' : '#0052cc', 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '10px' 
                    }}>RANK {level.rank}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b778c' }}>
                    {(level.groups || []).length} authorized groups
                </div>
            </div>
            
            {isExpanded && (
                <div style={{ padding: '16px', backgroundColor: 'white', borderTop: '1px solid #dfe1e6', animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#6b778c', textTransform: 'uppercase' }}>Authorized User Groups</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {(level.groups || []).map((group, gIndex) => (
                                <div key={gIndex} style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebf5ff', color: '#0052cc', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, border: '1px solid #cce5ff' }}>
                                    {group}
                                    <span onClick={(e) => { e.stopPropagation(); const newLevels = [...settings.clearanceLevels]; newLevels[levelIndex].groups = newLevels[levelIndex].groups.filter((_, i) => i !== gIndex); handleChange('clearanceLevels', newLevels); }} style={{ marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#0052cc' }}>×</span>
                                </div>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="Add group name..."
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
                            onClick={(e) => e.stopPropagation()}
                            style={{ padding: '8px 12px', width: '100%', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '13px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b778c', textTransform: 'uppercase' }}>Classification Keywords:</span>
                        <div style={{ fontSize: '12px', color: '#172b4d', fontFamily: 'monospace', backgroundColor: '#f4f5f7', padding: '4px 8px', borderRadius: '4px', border: '1px dashed #dfe1e6' }}>
                            {level.keywords.join(', ')}
                        </div>
                    </div>
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
    const [activeTab, setActiveTab] = useState('config'); // 'config' or 'review'
    const [incidents, setIncidents] = useState([]);
    const [refreshingIncidents, setRefreshingIncidents] = useState(false);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        setLoading(true);
        Promise.all([
            invoke('getSettings'),
            invoke('getVersion'),
            invoke('getIncidents')
        ]).then(([settingsData, versionData, incidentData]) => {
            setSettings(settingsData || {});
            setVersion(versionData);
            setIncidents(incidentData || []);
            setLoading(false);
        });
    };

    const fetchIncidents = async () => {
        setRefreshingIncidents(true);
        const data = await invoke('getIncidents');
        setIncidents(data || []);
        setRefreshingIncidents(false);
    };

    const handleAction = async (id, action) => {
        if (action === 'delete') {
            await invoke('deleteIncident', { id });
        } else {
            await invoke('updateIncidentStatus', { id, status: action });
        }
        fetchIncidents();
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await invoke('saveSettings', settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            alert("Failed to save settings.");
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

            setScanResults({ active: activeCount, quarantined: quarantinedCount, hitsByType: aggregatedHits, total: totalPages });
            fetchIncidents(); // Refresh log after scan
        } catch (e) {
            alert("Analysis failed.");
        } finally {
            setScanning(false);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6B778C' }}>🔄 Initializing Security Suite...</div>;

    const TabButton = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                padding: '12px 24px',
                backgroundColor: activeTab === id ? 'white' : 'transparent',
                color: activeTab === id ? '#0052cc' : '#6b778c',
                border: 'none',
                borderBottom: activeTab === id ? '3px solid #0052cc' : '3px solid transparent',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '15px'
            }}
        >
            {icon} {label}
        </button>
    );

    return (
        <div style={{ padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Helvetica Neue", sans-serif', maxWidth: '1000px', margin: '0 auto', color: '#172b4d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                     <h1 style={{ margin: 0, fontSize: '28px', background: 'linear-gradient(90deg, #172b4d 0%, #0052cc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800' }}>🛡️ Content Governance & Privacy</h1>
                     <p style={{ margin: '8px 0 0 0', color: '#6b778c', fontSize: '14px', fontWeight: '500' }}>Version 2.0.0 • Advanced Data Security & Institutional Safeguards</p>
                </div>
                {activeTab === 'config' && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: saved ? '#36b37e' : '#0052cc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(0,82,204,0.2)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {saving ? 'Saving...' : saved ? '✅ Saved' : 'Save Configuration'}
                    </button>
                )}
            </div>

            <DnaAnimation />

            <div style={{ display: 'flex', borderBottom: '1px solid #dfe1e6', marginBottom: '30px', gap: '10px' }}>
                <TabButton id="config" label="Security Profiles" icon="⚙️" />
                <TabButton id="review" label="Detection Oversight" icon="👁️" />
            </div>

            {activeTab === 'config' ? (
                <div style={{ animation: 'fadeIn 0.4s ease' }}>

                    {/* Analysis Dashboard */}
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '30px', border: '1px solid #dfe1e6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', color: '#172b4d' }}>Site-Wide Privacy Analysis</h3>
                                <p style={{ margin: '4px 0 0 0', color: '#6b778c', fontSize: '13px' }}>Institutional analysis of sensitive data distribution across all reachable content.</p>
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
                                    alignItems: 'center', gap: '8px'
                                }}
                            >
                                {scanning ? `Analyzing (${scanProgress}%)...` : '🔍 Launch Site Analysis'}
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
                                        <div style={{ fontSize: '11px', color: '#6b778c', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.8px', marginBottom: '8px' }}>Content Status</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#e3fcef', borderRadius: '8px', border: '1px solid #abf5d1' }}>
                                                <span style={{ fontWeight: '600', color: '#006644' }}>Clean Content</span>
                                                <span style={{ fontWeight: '800' }}>{scanResults.active}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#fffae6', borderRadius: '8px', border: '1px solid #fff0b3' }}>
                                                <span style={{ fontWeight: '600', color: '#825c00' }}>Total Flags</span>
                                                <span style={{ fontWeight: '800' }}>{Object.values(scanResults.hitsByType).reduce((a, b) => a + b, 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '15px', backgroundColor: '#f4f5f7', borderRadius: '8px', fontSize: '13px', border: '1px solid #dfe1e6', color: '#172b4d' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Executive Summary</div>
                                        Scan covered <strong>{scanResults.total}</strong> pages. Targeted remediation is recommended for identified risk clusters.
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#6b778c', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.8px', marginBottom: '12px' }}>Risk Incident Distribution</div>
                                    <Chart data={scanResults.hitsByType} selectedType={selectedMetric} onSelect={setSelectedMetric} />
                                </div>
                            </div>
                        ) : !scanning && (
                            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fafbfc', borderRadius: '8px', border: '2px dashed #dfe1e6' }}>
                                <div style={{ fontSize: '30px', marginBottom: '10px' }}>📊</div>
                                <div style={{ fontWeight: '600', color: '#172b4d' }}>System Ready for Analysis</div>
                                <div style={{ fontSize: '13px', color: '#6b778c', marginTop: '4px' }}>Initialize a scan to visualize potential data exposure across your environment.</div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                        {/* Rules Section */}
                        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #dfe1e6', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ marginTop: 0, fontSize: '18px', marginBottom: '15px' }}>Detection Rules</h3>
                            <p style={{ fontSize: '13px', color: '#6b778c', marginBottom: '20px' }}>Enable specialized scanners to monitor specific sensitive data patterns.</p>
                            
                            {Object.keys(settings).filter(k => !['regulatedGroupName', 'enableQuarantine', 'enableHistoricalScan', 'clearanceLevels', 'regulatedGroups'].includes(k)).map((key) => (
                                <div key={key} style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>
                                        {key === 'driversLicense' ? "Driver's License" : key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <Toggle checked={settings[key]} onChange={(e) => handleChange(key, e.target.checked)} />
                                </div>
                            ))}
                        </div>

                        {/* Automated Actions */}
                        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #dfe1e6', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ marginTop: 0, fontSize: '18px', marginBottom: '15px' }}>Response Protocol</h3>
                            <p style={{ fontSize: '13px', color: '#6b778c', marginBottom: '20px' }}>Configure how the system automatically reacts to detected sensitive information.</p>

                            <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                <Toggle checked={settings.enableQuarantine || false} onChange={(e) => handleChange('enableQuarantine', e.target.checked)} />
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Auto-Isolation (Quarantine)</div>
                                    <div style={{ fontSize: '12px', color: '#6b778c', lineHeight: '1.4' }}>Restrict page access immediately upon PII detection. Prevents unauthorized visibility during remediation.</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '0', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                <Toggle checked={settings.enableHistoricalScan || false} onChange={(e) => handleChange('enableHistoricalScan', e.target.checked)} />
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Historical Deep Scan</div>
                                    <div style={{ fontSize: '12px', color: '#6b778c', lineHeight: '1.4' }}>Analyze retroactive version history. Essential for identifying legacy data exposure.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Clearance Levels Accordion */}
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #dfe1e6', marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        <h3 style={{ marginTop: 0, fontSize: '18px', marginBottom: '10px' }}>Security Clearance Hierarchy</h3>
                        <p style={{ fontSize: '13px', color: '#6b778c', marginBottom: '20px' }}>Define institutional classification levels and associated access control lists.</p>
                        
                        {(settings.clearanceLevels || []).map((level, levelIndex) => (
                            <ClearanceLevel key={level.id} level={level} levelIndex={levelIndex} settings={settings} handleChange={handleChange} />
                        ))}
                    </div>

                    {/* Regulated User Controls */}
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #dfe1e6', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        <h3 style={{ marginTop: 0, fontSize: '18px', marginBottom: '10px' }}>Regulated Individual Controls</h3>
                        <p style={{ fontSize: '13px', color: '#6b778c', marginBottom: '20px' }}>Restrict privileged operations for users identified in high-risk groups.</p>

                        <div style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                {(settings.regulatedGroups || []).map((group, index) => (
                                    <div key={index} style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fff0b3', color: '#825c00', borderRadius: '4px', padding: '4px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #ffe380' }}>
                                        {group}
                                        <span onClick={() => { const currentGroups = settings.regulatedGroups || []; handleChange('regulatedGroups', currentGroups.filter((_, i) => i !== index)); }} style={{ marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold' }}>×</span>
                                    </div>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="+ Add high-risk group..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = e.target.value.trim();
                                        if (val) {
                                            const currentGroups = settings.regulatedGroups || [];
                                            if (!currentGroups.includes(val)) {
                                                handleChange('regulatedGroups', [...currentGroups, val]);
                                            }
                                            e.target.value = '';
                                        }
                                    }
                                }}
                                style={{ padding: '10px', width: '100%', maxWidth: '300px', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '13px' }}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ animation: 'fadeIn 0.4s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '22px' }}>Detection Oversight Log</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#6b778c', fontSize: '13px' }}>Monitor and remediate identified sensitive information across your spaces.</p>
                        </div>
                        <button 
                            onClick={fetchIncidents}
                            disabled={refreshingIncidents}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'transparent',
                                color: '#0052cc',
                                border: '1px solid #0052cc',
                                borderRadius: '6px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '13px'
                            }}
                        >
                            {refreshingIncidents ? '🔄 Refreshing...' : '↻ Refresh Log'}
                        </button>
                    </div>

                    <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dfe1e6', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f4f5f7', color: '#6b778c', borderBottom: '1px solid #dfe1e6' }}>
                                    <th style={{ padding: '16px' }}>Detection Timestamp</th>
                                    <th style={{ padding: '16px' }}>Entity / Location</th>
                                    <th style={{ padding: '16px' }}>Space Context</th>
                                    <th style={{ padding: '16px' }}>PII Profile</th>
                                    <th style={{ padding: '16px' }}>Governance Status</th>
                                    <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#6b778c' }}>
                                            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🛡️</div>
                                            <div style={{ fontWeight: '600' }}>No incidents recorded in current history.</div>
                                            <div>The system will log findings as they occur during real-time scanning.</div>
                                        </td>
                                    </tr>
                                ) : incidents.map((inc) => (
                                    <tr key={inc.id} style={{ borderBottom: '1px solid #f4f5f7', transition: 'background-color 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafbfc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ padding: '16px', verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: '600', color: '#172b4d' }}>{new Date(inc.timestamp).toLocaleDateString()}</div>
                                            <div style={{ fontSize: '12px', color: '#6b778c' }}>{new Date(inc.timestamp).toLocaleTimeString()}</div>
                                        </td>
                                        <td style={{ padding: '16px', verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: '600' }}>{inc.title}</div>
                                            <div style={{ fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                                                <span style={{ padding: '2px 6px', backgroundColor: '#ebecf0', borderRadius: '3px', fontWeight: 'bold', color: '#42526e' }}>{inc.type.toUpperCase()}</span>
                                                <span style={{ color: '#6b778c' }}>ID: {inc.pageId}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: '500' }}>{inc.spaceName}</div>
                                            <div style={{ fontSize: '12px', color: '#6b778c' }}>Key: {inc.spaceKey}</div>
                                        </td>
                                        <td style={{ padding: '16px', verticalAlign: 'top' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {inc.piiTypes.map(t => (
                                                    <span key={t} style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#e3fcef', color: '#006644', borderRadius: '12px', fontWeight: 'bold', border: '1px solid #abf5d1' }}>{t}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', verticalAlign: 'top' }}>
                                            <span style={{
                                                fontSize: '12px',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontWeight: 'bold',
                                                backgroundColor: inc.status === 'Resolved' ? '#e3fcef' : inc.status === 'Quarantined' ? '#fffae6' : '#ffebe6',
                                                color: inc.status === 'Resolved' ? '#006644' : inc.status === 'Quarantined' ? '#825c00' : '#bf2600',
                                                display: 'inline-block'
                                            }}>
                                                {inc.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', verticalAlign: 'top', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                {inc.status !== 'Resolved' && (
                                                    <button 
                                                        onClick={() => handleAction(inc.id, 'Resolved')}
                                                        style={{ padding: '4px 8px', backgroundColor: '#36b37e', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                                    >Acknowledge</button>
                                                )}
                                                <button 
                                                    onClick={() => handleAction(inc.id, 'delete')}
                                                    style={{ padding: '4px 8px', backgroundColor: '#ebecf0', color: '#42526e', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                                >Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                button:hover {
                    opacity: 0.9;
                }
                tr:hover td {
                    color: #0052cc;
                }
            `}</style>

            {version && (
                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #dfe1e6', textAlign: 'center', color: '#6b778c', fontSize: '12px', fontWeight: '500' }}>
                    Advanced Security Suite v{version.version} • Built with Institutional Safeguards
                </div>
            )}
        </div>
    );
};
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
