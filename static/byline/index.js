import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke } from '@forge/bridge';

const ShieldIcon = ({ color = '#de350b', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
            fill={color}
            opacity="0.15"
        />
        <path
            d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
        />
        <path
            d="M12 8v4M12 16h.01"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

const CheckIcon = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
            fill="#36b37e"
            opacity="0.15"
        />
        <path
            d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
            stroke="#36b37e"
            strokeWidth="1.5"
            fill="none"
        />
        <path d="M9 12l2 2 4-4" stroke="#36b37e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const PII_TYPE_LABELS = {
    email: '📧 Email',
    phone: '📞 Phone',
    creditCard: '💳 Credit Card',
    ssn: '🔐 SSN',
    passport: '🛂 Passport',
    driversLicense: '🪪 Driver\'s License',
};

const styles = {
    container: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '12px',
        lineHeight: '1.4',
        color: '#172b4d',
    },
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        userSelect: 'none',
    },
    badgeActive: {
        backgroundColor: '#ffebe6',
        border: '1px solid #ff8f73',
    },
    badgeResolved: {
        backgroundColor: '#e3fcef',
        border: '1px solid #57d9a3',
    },
    badgeClean: {
        backgroundColor: '#f4f5f7',
        border: '1px solid #dfe1e6',
    },
    badgeLabel: {
        fontWeight: '600',
        fontSize: '11px',
    },
    popup: {
        position: 'absolute',
        top: '100%',
        left: '0',
        marginTop: '8px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        padding: '16px',
        minWidth: '280px',
        maxWidth: '360px',
        zIndex: 1000,
        animation: 'fadeIn 0.15s ease-out',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        paddingBottom: '10px',
        borderBottom: '1px solid #ebecf0',
    },
    headerTitle: {
        fontWeight: '700',
        fontSize: '14px',
        color: '#de350b',
    },
    headerTitleResolved: {
        fontWeight: '700',
        fontSize: '14px',
        color: '#006644',
    },
    tag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '500',
        backgroundColor: '#f4f5f7',
        color: '#42526e',
        marginRight: '4px',
        marginBottom: '4px',
    },
    timestamp: {
        fontSize: '11px',
        color: '#6b778c',
        marginTop: '10px',
    },
    countBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: '#de350b',
        color: '#fff',
        fontSize: '10px',
        fontWeight: '700',
    },
};

function App() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        invoke('getPagePiiStatus')
            .then(data => {
                setStatus(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return null;
    if (!status) return null;

    // Clean page — show nothing (no visual clutter)
    if (!status.hasPii) {
        return null;
    }

    const isActive = status.status === 'active';
    const badgeStyle = {
        ...styles.badge,
        ...(isActive ? styles.badgeActive : styles.badgeResolved),
    };

    const formatTime = (ts) => {
        if (!ts) return 'Unknown';
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={styles.container}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <div
                    style={badgeStyle}
                    onClick={() => setExpanded(!expanded)}
                    title={isActive ? 'PII Detected — Click for details' : 'PII Resolved'}
                >
                    {isActive ? (
                        <>
                            <ShieldIcon color="#de350b" size={14} />
                            <span style={{ ...styles.badgeLabel, color: '#de350b' }}>PII</span>
                            {status.incidentCount > 0 && (
                                <span style={styles.countBadge}>{status.incidentCount}</span>
                            )}
                        </>
                    ) : (
                        <>
                            <CheckIcon size={14} />
                            <span style={{ ...styles.badgeLabel, color: '#006644' }}>Resolved</span>
                        </>
                    )}
                </div>

                {expanded && (
                    <div style={styles.popup}>
                        <div style={styles.header}>
                            {isActive ? <ShieldIcon color="#de350b" size={20} /> : <CheckIcon size={20} />}
                            <span style={isActive ? styles.headerTitle : styles.headerTitleResolved}>
                                {isActive ? 'Sensitive Data Detected' : 'Findings Resolved'}
                            </span>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#6b778c', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                                Detected PII Types
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                {(status.piiTypes || []).map(type => (
                                    <span key={type} style={styles.tag}>
                                        {PII_TYPE_LABELS[type] || type}
                                    </span>
                                ))}
                                {(!status.piiTypes || status.piiTypes.length === 0) && (
                                    <span style={styles.tag}>Details in Oversight Log</span>
                                )}
                            </div>
                        </div>

                        {status.totalIncidents > 0 && (
                            <div style={{ fontSize: '12px', color: '#42526e', marginBottom: '4px' }}>
                                <strong>{status.totalIncidents}</strong> incident{status.totalIncidents !== 1 ? 's' : ''} recorded
                                {status.incidentCount > 0 && (
                                    <span style={{ color: '#de350b' }}> ({status.incidentCount} active)</span>
                                )}
                            </div>
                        )}

                        <div style={styles.timestamp}>
                            Last detected: {formatTime(status.lastDetected)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
