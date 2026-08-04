/**
 * DialogContext — global confirmation modal with optional reason field.
 *
 * Usage:
 *   const { confirm } = useDialog();
 *   const ok = await confirm({ title: 'Suspend Seller', message: '...', isDestructive: true });
 *   if (ok) doTheThing();
 *
 *   // With reason input:
 *   const result = await confirm({ ..., withReason: true, reasonPlaceholder: 'e.g. Violation…' });
 *   if (result.confirmed) doTheThing(result.reason);
 */
import React, {
    createContext, useCallback, useContext, useRef, useState, ReactNode,
} from 'react';
import {
    Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import ModalPortal from '@/components/ui/ModalPortal';
import { AlertTriangle, Info } from 'lucide-react-native';

// ── Design tokens (mirrors the admin palette) ────────────────────────────────
const CARD   = '#FFFFFF';
const BG     = '#F4F4F8';
const TEXT   = '#1A1A2E';
const SUB    = '#6B7280';
const BORDER = '#F0F0F5';
const RED    = '#EF4444';
const P      = '#B36979';

// ── Public API ────────────────────────────────────────────────────────────────
export interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    /** When true a TextInput is shown and `result.reason` is populated */
    withReason?: boolean;
    reasonPlaceholder?: string;
    isDestructive?: boolean;
}

export type ConfirmResult =
    | { confirmed: true;  reason: string }
    | { confirmed: false; reason: undefined };

interface DialogContextType {
    /** Simple boolean form (no reason field) */
    confirm(options: ConfirmOptions & { withReason?: false }): Promise<boolean>;
    /** Extended form — returns {confirmed, reason} */
    confirm(options: ConfirmOptions & { withReason: true }): Promise<ConfirmResult>;
    /** Union overload so callers can pass either */
    confirm(options: ConfirmOptions): Promise<boolean | ConfirmResult>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog(): DialogContextType {
    const ctx = useContext(DialogContext);
    if (!ctx) throw new Error('useDialog must be used inside <DialogProvider>');
    return ctx;
}

// ── Internal state ────────────────────────────────────────────────────────────
interface DialogState extends ConfirmOptions {
    resolve: (value: boolean | ConfirmResult) => void;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function DialogProvider({ children }: { children: ReactNode }) {
    const [dialog, setDialog] = useState<DialogState | null>(null);
    const [reason, setReason] = useState('');
    const inputRef = useRef<TextInput>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean | ConfirmResult>((resolve) => {
            setReason('');
            setDialog({ ...options, resolve });
        });
    }, []);

    const close = (confirmed: boolean) => {
        if (!dialog) return;
        if (dialog.withReason) {
            dialog.resolve(confirmed
                ? { confirmed: true,  reason }
                : { confirmed: false, reason: undefined }
            );
        } else {
            dialog.resolve(confirmed);
        }
        setDialog(null);
    };

    const confirmColor = dialog?.confirmColor
        ?? (dialog?.isDestructive ? RED : P);

    return (
        <DialogContext.Provider value={{ confirm } as DialogContextType}>
            {children}

            {dialog && (
                <ModalPortal>
                    <View style={s.overlay}>
                        {/* Backdrop — tap to cancel */}
                        <TouchableOpacity
                            style={StyleSheet.absoluteFillObject}
                            activeOpacity={1}
                            onPress={() => close(false)}
                        />

                        <View style={s.card}>
                            <View style={s.body}>
                                <View style={s.titleRow}>
                                    {dialog.isDestructive ? (
                                        <AlertTriangle size={22} color={confirmColor} />
                                    ) : (
                                        <Info size={22} color={confirmColor} />
                                    )}
                                    <Text style={s.title}>{dialog.title}</Text>
                                </View>
                                <Text style={s.message}>{dialog.message}</Text>

                                {dialog.withReason && (
                                    <TextInput
                                        ref={inputRef}
                                        style={s.input}
                                        value={reason}
                                        onChangeText={setReason}
                                        placeholder={dialog.reasonPlaceholder ?? 'Add a reason…'}
                                        placeholderTextColor={SUB}
                                        multiline
                                        numberOfLines={3}
                                        // @ts-ignore web
                                        autoFocus={Platform.OS === 'web'}
                                    />
                                )}

                                <View style={s.actions}>
                                    <TouchableOpacity style={s.cancelBtn} onPress={() => close(false)}>
                                        <Text style={s.cancelBtnTxt}>{dialog.cancelText ?? 'Cancel'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            s.confirmBtn, 
                                            { backgroundColor: confirmColor },
                                            (dialog.withReason && !reason.trim()) && { opacity: 0.5 }
                                        ]}
                                        onPress={() => {
                                            if (dialog.withReason && !reason.trim()) return;
                                            close(true);
                                        }}
                                        disabled={dialog.withReason && !reason.trim()}
                                    >
                                        <Text style={s.confirmBtnTxt}>{dialog.confirmText ?? 'Confirm'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </ModalPortal>
            )}
        </DialogContext.Provider>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        zIndex: 9999,
    },
    card: {
        backgroundColor: CARD,
        borderRadius: 24,
        width: '100%',
        maxWidth: 440,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 32,
        elevation: 16,
    },
    body: {
        padding: 24,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    message: {
        fontSize: 14,
        color: SUB,
        fontFamily: 'Quicksand',
        lineHeight: 22,
        marginBottom: 20,
    },
    input: {
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        fontFamily: 'Quicksand',
        color: TEXT,
        minHeight: 88,
        textAlignVertical: 'top',
        marginBottom: 20,
        // @ts-ignore web
        outlineStyle: 'none' as any,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    cancelBtn: {
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 12,
        backgroundColor: BG,
    },
    cancelBtnTxt: {
        color: SUB,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
    confirmBtn: {
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 12,
    },
    confirmBtnTxt: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'Quicksand',
    },
});
