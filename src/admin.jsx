import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Form, CheckboxGroup, Checkbox, Stack, Heading } from '@forge/react';
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

    const onSubmit = async (formData) => {
        const piiTypes = formData.piiTypes || [];
        const actions = formData.actions || [];
        const newSettings = {
            email: piiTypes.includes('email'),
            phone: piiTypes.includes('phone'),
            creditCard: piiTypes.includes('creditCard'),
            ssn: piiTypes.includes('ssn'),
            passport: piiTypes.includes('passport'),
            driversLicense: piiTypes.includes('driversLicense'),
            enableQuarantine: actions.includes('quarantine')
        };

        await storage.set(STORAGE_KEY, newSettings);
        setSettings(newSettings);
    };

    if (!settings) {
        return <Text>Loading settings...</Text>;
    }

    return (
        <Stack space="space.200">
            <Heading as="h2">PII Configuration</Heading>
            <Text>Use the settings below to control which types of PII are automatically detected and acted upon.</Text>

            <Form onSubmit={onSubmit} submitButtonText="Save Configuration">
                <CheckboxGroup name="piiTypes" label="Enabled PII Detectors">
                    <Checkbox defaultChecked={settings.email} value="email" label="Email Addresses" />
                    <Checkbox defaultChecked={settings.phone} value="phone" label="Phone Numbers" />
                    <Checkbox defaultChecked={settings.creditCard} value="creditCard" label="Credit Card Numbers" />
                    <Checkbox defaultChecked={settings.ssn} value="ssn" label="Social Security Numbers (SSN)" />
                    <Checkbox defaultChecked={settings.passport} value="passport" label="Passport Numbers" />
                    <Checkbox defaultChecked={settings.driversLicense} value="driversLicense" label="Driver's Licenses" />
                </CheckboxGroup>

                <CheckboxGroup name="actions" label="Automated Actions">
                    <Checkbox 
                        defaultChecked={settings.enableQuarantine} 
                        value="quarantine" 
                        label="Quarantine Pages (Restrict access to page author only when PII is detected)" 
                    />
                </CheckboxGroup>
            </Form>
        </Stack>
    );
};

export const run = ForgeReconciler.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
