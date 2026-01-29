import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Button, Toggle, Stack, Heading } from '@forge/react';
import { storage } from '@forge/api';

const STORAGE_KEY = 'pii-settings-v1';

const App = () => {
    const [settings, setSettings] = useState(null);

    // Load settings on mount
    useEffect(() => {
        storage.get(STORAGE_KEY).then(stored => {
            setSettings(stored || {
                email: true,
                phone: true,
                creditCard: true,
                ssn: true,
                passport: true,
                driversLicense: true,
                enableQuarantine: false
            });
        });
    }, []);

    const handleToggle = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        await storage.set(STORAGE_KEY, settings);
    };

    if (!settings) {
        return <Text>Loading settings...</Text>;
    }

    return (
        <Stack space="space.400">
            {/* Detection Rules Section */}
            <Stack space="space.200">
                <Heading as="h2">PII Detection Rules</Heading>
                <Text>
                    Select which types of personally identifiable information (PII) should be automatically 
                    detected in Confluence pages. When detected, these will trigger configured actions below.
                </Text>
            </Stack>

            <Stack space="space.200">
                <Toggle 
                    isChecked={settings.email}
                    onChange={() => handleToggle('email')}
                    label="Email Addresses"
                />
                <Toggle 
                    isChecked={settings.phone}
                    onChange={() => handleToggle('phone')}
                    label="Phone Numbers"
                />
                <Toggle 
                    isChecked={settings.creditCard}
                    onChange={() => handleToggle('creditCard')}
                    label="Credit Card Numbers"
                />
                <Toggle 
                    isChecked={settings.ssn}
                    onChange={() => handleToggle('ssn')}
                    label="Social Security Numbers (SSN)"
                />
                <Toggle 
                    isChecked={settings.passport}
                    onChange={() => handleToggle('passport')}
                    label="Passport Numbers"
                />
                <Toggle 
                    isChecked={settings.driversLicense}
                    onChange={() => handleToggle('driversLicense')}
                    label="Driver's Licenses"
                />
            </Stack>

            {/* Actions Section - Visually Separated */}
            <Stack space="space.200">
                <Heading as="h3">Automated Actions</Heading>
                <Text>
                    Configure what actions should be taken when PII is detected on a page.
                </Text>
            </Stack>

            <Stack space="space.200">
                <Toggle 
                    isChecked={settings.enableQuarantine}
                    onChange={() => handleToggle('enableQuarantine')}
                    label="Enable automatic quarantine - Restrict page access to author only when PII is detected"
                />
            </Stack>

            <Button appearance="primary" onClick={handleSave}>
                Save Configuration
            </Button>
        </Stack>
    );
};

export const run = ForgeReconciler.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
