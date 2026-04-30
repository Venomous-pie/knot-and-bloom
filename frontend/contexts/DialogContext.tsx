import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { StyleSheet, View, Text, Pressable, Modal, Animated } from 'react-native';
import { theme } from '@/constants/theme';

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

interface DialogContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
}

interface DialogState extends ConfirmOptions {
    resolve: (value: boolean) => void;
}

export function DialogProvider({ children }: { children: ReactNode }) {
    const [dialogState, setDialogState] = useState<DialogState | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setDialogState({
                ...options,
                resolve,
            });
        });
    }, []);

    const handleConfirm = () => {
        if (dialogState) {
            dialogState.resolve(true);
            setDialogState(null);
        }
    };

    const handleCancel = () => {
        if (dialogState) {
            dialogState.resolve(false);
            setDialogState(null);
        }
    };

    return (
        <DialogContext.Provider value={{ confirm }}>
            {children}
            
            <Modal
                visible={!!dialogState}
                transparent={true}
                onRequestClose={handleCancel}
            >
                <View style={styles.overlay}>
                    <Pressable style={styles.backdrop} onPress={handleCancel} />
                    {dialogState && (
                        <View style={styles.dialogBox}>
                            <Text style={styles.title}>{dialogState.title}</Text>
                            <Text style={styles.message}>{dialogState.message}</Text>
                            
                            <View style={styles.actions}>
                                <Pressable
                                    style={styles.cancelButton}
                                    onPress={handleCancel}
                                >
                                    <Text style={styles.cancelText}>
                                        {dialogState.cancelText || 'Cancel'}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.confirmButton,
                                        dialogState.isDestructive && styles.destructiveButton
                                    ]}
                                    onPress={handleConfirm}
                                >
                                    <Text style={styles.confirmText}>
                                        {dialogState.confirmText || 'Confirm'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </DialogContext.Provider>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 10,
    },
    dialogBox: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 400,
        zIndex: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 12,
        fontFamily: 'Quicksand',
    },
    message: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        marginBottom: 24,
        lineHeight: 22,
        fontFamily: 'Quicksand',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: theme.colors.backgroundAlt,
    },
    cancelText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
    confirmButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: theme.colors.primary,
    },
    destructiveButton: {
        backgroundColor: theme.colors.error,
    },
    confirmText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
});
