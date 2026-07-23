import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toastEvents } from '@/utils/toastEvents';

interface SellerSettings {
    aiDescriptionEnabled: boolean;
}

interface SellerSettingsContextType {
    settings: SellerSettings;
    updateSetting: <K extends keyof SellerSettings>(key: K, value: SellerSettings[K]) => Promise<void>;
    loading: boolean;
}

const DEFAULT_SETTINGS: SellerSettings = {
    aiDescriptionEnabled: false,
};

const STORAGE_KEY = 'seller_settings';

const SellerSettingsContext = createContext<SellerSettingsContextType>({
    settings: DEFAULT_SETTINGS,
    updateSetting: async () => {},
    loading: true,
});

export const useSellerSettings = () => useContext(SellerSettingsContext);

export const SellerSettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<SellerSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
            }
        } catch (error) {
            console.error('Failed to load seller settings', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async <K extends keyof SellerSettings>(key: K, value: SellerSettings[K]) => {
        const updated = { ...settings, [key]: value };
        setSettings(updated);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            toastEvents.emit({ message: 'Settings saved.', type: 'SUCCESS' });
        } catch (error) {
            console.error('Failed to save seller settings', error);
        }
    };

    return (
        <SellerSettingsContext.Provider value={{ settings, updateSetting, loading }}>
            {children}
        </SellerSettingsContext.Provider>
    );
};
