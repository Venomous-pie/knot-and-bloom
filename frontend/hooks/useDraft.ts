import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UseDraftOptions<T> {
    /** Unique AsyncStorage key for this draft */
    key: string;
    /** Current data to auto-save */
    data: T;
    /** Whether draft saving is enabled (e.g. disabled when editing existing items) */
    enabled?: boolean;
    /** Debounce delay in ms before writing to storage (default: 1000) */
    debounceMs?: number;
    /** Callback to restore draft data into component state */
    onLoad: (draft: T) => void;
}

/**
 * Centralized hook for auto-saving and restoring draft data via AsyncStorage.
 *
 * Usage:
 * ```ts
 * const { clearDraft } = useDraft({
 *     key: 'product_form_draft',
 *     data: { formData, selectedCategories, variants, images },
 *     enabled: !isEditing,
 *     onLoad: (draft) => {
 *         setFormData(draft.formData);
 *         setSelectedCategories(draft.selectedCategories);
 *         // ...
 *     },
 * });
 * ```
 */
export function useDraft<T>({ key, data, enabled = true, debounceMs = 1000, onLoad }: UseDraftOptions<T>) {
    const loadedRef = useRef(false);
    const onLoadRef = useRef(onLoad);
    onLoadRef.current = onLoad;

    // Load draft on mount (only once)
    useEffect(() => {
        if (!enabled || loadedRef.current) return;
        loadedRef.current = true;

        const load = async () => {
            try {
                const saved = await AsyncStorage.getItem(key);
                if (saved) {
                    const parsed = JSON.parse(saved) as T;
                    onLoadRef.current(parsed);
                }
            } catch (error) {
                console.error(`[useDraft] Failed to load draft "${key}":`, error);
            }
        };

        load();
    }, [key, enabled]);

    // Auto-save draft on data change (debounced)
    useEffect(() => {
        if (!enabled) return;

        const timer = setTimeout(async () => {
            try {
                await AsyncStorage.setItem(key, JSON.stringify(data));
            } catch (error) {
                // Silent fail — draft saving is best-effort
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [key, data, enabled, debounceMs]);

    // Clear draft
    const clearDraft = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error(`[useDraft] Failed to clear draft "${key}":`, error);
        }
    }, [key]);

    return { clearDraft };
}
