import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Animated,
    ScrollView,
    Image,
    Alert
} from 'react-native';
import { theme } from '@/constants/theme';
import { Send, User, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { chatAPI, productAPI } from '@/api/api';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    type?: 'text' | 'limit_reached';
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: string;
    updatedAt: string;
}

const QUICK_REPLIES = [
    "Track my order",
    "Request a return",
    "Ask about a product",
    "Custom order inquiry"
];

const WELCOME_MESSAGE: Message = {
    id: 'welcome',
    role: 'assistant',
    content: 'Hello! I am the Knot & Bloom Customer Assistant. How can I help you today?',
    timestamp: new Date().toISOString()
};

function getSessionsKey(userId?: number | string | null): string {
    return userId ? `chat_sessions_user_${userId}` : 'chat_sessions_guest';
}

function makeWelcomeMessage(): Message {
    return { ...WELCOME_MESSAGE, id: Date.now().toString(), timestamp: new Date().toISOString() };
}

function makeSession(): ChatSession {
    return {
        id: Date.now().toString(),
        title: 'New Conversation',
        messages: [makeWelcomeMessage()],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

const TypingIndicator = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animateDot = (dot: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(dot, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true })
                ])
            ).start();
        };

        animateDot(dot1, 0);
        animateDot(dot2, 200);
        animateDot(dot3, 400);
    }, []);

    const getDotStyle = (anim: Animated.Value) => ({
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }]
    });

    return (
        <View style={styles.typingContainer}>
            <View style={styles.avatarAssistant}>
                <Image source={require('../../assets/bot.png')} style={styles.botImage} />
            </View>
            <View style={styles.typingBubble}>
                <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
                <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
                <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
            </View>
        </View>
    );
};

export default function ChatScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { confirm } = useDialog();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>('');
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [inputHeight, setInputHeight] = useState(48);
    const [isLoading, setIsLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    const sessionsKey = getSessionsKey(user?.uid);
    const activeSession = sessions.find(s => s.id === activeSessionId);
    const messages = activeSession?.messages ?? [WELCOME_MESSAGE];

    // ─── Load sessions on mount ─────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const raw = await AsyncStorage.getItem(sessionsKey);
                if (raw) {
                    const saved: ChatSession[] = JSON.parse(raw);
                    if (saved.length > 0) {
                        setSessions(saved);
                        setActiveSessionId(saved[0].id);
                        return;
                    }
                }
            } catch (e) {
                console.warn('Could not load sessions:', e);
            }
            // No sessions yet — create a fresh one
            const fresh = makeSession();
            setSessions([fresh]);
            setActiveSessionId(fresh.id);
        };
        load();
    }, [sessionsKey]);

    // ─── Persist sessions whenever they change ──────────────────────
    useEffect(() => {
        if (sessions.length === 0) return;
        AsyncStorage.setItem(sessionsKey, JSON.stringify(sessions)).catch(() => {});
    }, [sessions, sessionsKey]);

    // ─── Online status check ────────────────────────────────────────
    useEffect(() => {
        const checkStatus = async () => {
            try {
                await productAPI.getCategoryCounts();
                setIsOnline(true);
            } catch (error: any) {
                if (error.message === 'Network Error' || error.code === 'ERR_NETWORK' || !error.response) {
                    setIsOnline(false);
                }
            }
        };
        checkStatus();
    }, []);

    const isGuestLimited = !user && messages.length >= 21;

    // ─── Update messages in the active session ──────────────────────
    const updateSessionMessages = (updater: (prev: Message[]) => Message[]) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== activeSessionId) return s;
            const newMessages = updater(s.messages);
            // Use first user message as session title
            const firstUser = newMessages.find(m => m.role === 'user');
            const title = firstUser
                ? firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? '…' : '')
                : s.title;
            return { ...s, messages: newMessages, title, updatedAt: new Date().toISOString() };
        }));
    };

    // ─── Start new conversation ─────────────────────────────────────
    const handleNewConversation = async () => {
        const doCreate = () => {
            const fresh = makeSession();
            setSessions(prev => [fresh, ...prev]);
            setActiveSessionId(fresh.id);
        };
        
        const isConfirmed = await confirm({
            title: 'New Conversation',
            message: 'Start a fresh chat?',
            confirmText: 'Start Fresh',
            cancelText: 'Cancel'
        });

        if (isConfirmed) {
            doCreate();
        }
    };

    const handleSend = async (textToSend: string = input) => {
        const text = textToSend.trim();
        if (!text) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        };

        updateSessionMessages(prev => [...prev, userMsg]);
        setInput('');
        setInputHeight(48);
        setIsLoading(true);

        try {
            const history = [...messages, userMsg].map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await chatAPI.sendAiMessage(history);

            if (response.data.success) {
                let replyContent = response.data.reply;
                let replyType: 'text' | 'limit_reached' = 'text';

                try {
                    const parsed = JSON.parse(replyContent);
                    if (parsed.type === 'limit_reached') {
                        replyContent = parsed.content;
                        replyType = 'limit_reached';
                    }
                } catch (e) {
                    // Normal text, not JSON
                }

                const assistantMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: replyContent,
                    timestamp: new Date().toISOString(),
                    type: replyType
                };
                updateSessionMessages(prev => [...prev, assistantMsg]);
            } else {
                throw new Error("Failed to get a response");
            }

        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I am having trouble connecting to the server right now. Please try again later.',
                timestamp: new Date().toISOString()
            };
            updateSessionMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderFormattedText = (text: string, isUser: boolean) => {
        if (!text) return null;

        const baseStyle = [styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAssistant];

        const regex = /(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g;
        const parts = text.split(regex);

        return (
            <Text style={baseStyle}>
                {parts.map((part, index) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <Text key={index} style={{ fontWeight: 'bold' }}>{part.slice(2, -2)}</Text>;
                    }
                    if (part.startsWith('*') && part.endsWith('*')) {
                        return <Text key={index} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
                    }
                    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
                        const match = part.match(/\[(.*?)\]\((.*?)\)/);
                        if (match) {
                            return (
                                <Text
                                    key={index}
                                    style={{ textDecorationLine: 'underline', fontWeight: '500' }}
                                >
                                    {match[1]}
                                </Text>
                            );
                        }
                    }
                    return <Text key={index}>{part}</Text>;
                })}
            </Text>
        );
    };

    const renderMessage = ({ item }: { item: Message }) => {
        if (item.type === 'limit_reached') {
            return (
                <View style={styles.limitReachedContainer}>
                    <Text style={styles.limitReachedText}>{item.content}</Text>
                    <Pressable onPress={() => router.push('/auth' as any)} style={styles.limitReachedButton}>
                        <Text style={styles.limitReachedButtonText}>Log In or Register</Text>
                    </Pressable>
                </View>
            );
        }

        const isUser = item.role === 'user';
        return (
            <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
                {!isUser && (
                    <View style={styles.avatarAssistant}>
                        <Image source={require('../../assets/bot.png')} style={styles.botImage} />
                    </View>
                )}

                <View style={isUser ? styles.messageContentUser : styles.messageContentAssistant}>
                    <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant]}>
                        {renderFormattedText(item.content, isUser)}
                    </View>
                    <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAssistant]}>
                        {formatTime(item.timestamp)}
                    </Text>
                </View>

                {isUser && (
                    <View style={styles.avatarUser}>
                        <User size={20} color="#FFF" />
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.text} />
                </Pressable>
                <View style={styles.headerTitleContainer}>
                    <View style={styles.statusIndicatorContainer}>
                        <Image source={require('../../assets/bot.png')} style={styles.botImage} />
                        <View style={[styles.statusDot, !isOnline && { backgroundColor: '#DC3545' }]} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Knot & Bloom Support</Text>
                        <Text style={[styles.statusText, !isOnline && { color: '#DC3545' }]}>
                            {isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Body: sidebar + chat */}
            <View style={styles.body}>
                {/* Left Sidebar — wrapper holds content + pull-tab */}
                <View style={styles.sidebarWrapper}>
                    {sidebarOpen && (
                        <View style={styles.sidebar}>
                            <Pressable style={styles.sidebarNewBtn} onPress={handleNewConversation}>
                                <RotateCcw size={14} color={theme.colors.primary} />
                                <Text style={styles.sidebarNewBtnText}>New Conversation</Text>
                            </Pressable>
                            <Text style={styles.sidebarHeading}>History</Text>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {sessions.map(session => (
                                    <Pressable
                                        key={session.id}
                                        style={[
                                            styles.sessionItem,
                                            session.id === activeSessionId && styles.sessionItemActive
                                        ]}
                                        onPress={() => setActiveSessionId(session.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.sessionTitle,
                                                session.id === activeSessionId && styles.sessionTitleActive
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {session.title}
                                        </Text>
                                        <Text style={styles.sessionDate}>
                                            {new Date(session.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                    {/* Collapse tab — always visible, centered on the right edge */}
                    <Pressable
                        style={[styles.collapseTab, !sidebarOpen && styles.collapseTabCollapsed]}
                        onPress={() => setSidebarOpen(v => !v)}
                    >
                        {sidebarOpen
                            ? <ChevronLeft size={14} color={theme.colors.textSecondary} />
                            : <ChevronRight size={14} color="#FFF" />
                        }
                    </Pressable>
                </View>

                {/* Chat Area */}
                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <View style={styles.contentWrapper}>
                        <View style={styles.chatArea}>
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                keyExtractor={item => item.id}
                                renderItem={renderMessage}
                                contentContainerStyle={styles.chatList}
                                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                                ListHeaderComponent={
                                    messages.length === 1 ? (
                                        <View style={styles.brandingCenterContainer}>
                                            <View style={styles.brandingLogoRow}>
                                                <Image source={require('../../assets/yarn.png')} style={styles.brandingYarn} resizeMode='contain' />
                                                <Text style={styles.brandingKnot}>Knot</Text>
                                                <Text style={styles.brandingBloom}>&Bloom</Text>
                                            </View>
                                            <Text style={styles.brandingSubtitle}>
                                                A multi-vendor marketplace dedicated to handcrafted goods
                                            </Text>
                                        </View>
                                    ) : null
                                }
                                ListFooterComponent={isLoading ? <TypingIndicator /> : null}
                            />
                        </View>

                        {/* Quick Replies */}
                        {messages.length === 1 && !isLoading && (
                            <View>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.quickRepliesContainer}
                                >
                                    {QUICK_REPLIES.map((reply, index) => (
                                        <Pressable
                                            key={index}
                                            style={styles.quickReplyChip}
                                            onPress={() => handleSend(reply)}
                                        >
                                            <Text style={styles.quickReplyText}>{reply}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    style={[
                                        styles.input,
                                        isFocused && styles.inputFocused,
                                        isGuestLimited && styles.inputDisabled,
                                        { height: Math.max(48, Math.min(120, inputHeight)) }
                                    ]}
                                    value={input}
                                    onChangeText={setInput}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    selectionColor={theme.colors.primary}
                                    onContentSizeChange={(e) => {
                                        setInputHeight(e.nativeEvent.contentSize.height);
                                    }}
                                    placeholder={!isOnline ? "Support is offline" : isGuestLimited ? "Limit reached..." : "Type your message..."}
                                    placeholderTextColor={theme.colors.textLight}
                                    multiline
                                    maxLength={280}
                                    editable={!isGuestLimited && isOnline}
                                    onSubmitEditing={() => {
                                        if (Platform.OS === 'web' && !isGuestLimited && isOnline) handleSend();
                                    }}
                                    onKeyPress={(e) => {
                                        if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !(e.nativeEvent as any).shiftKey && !isGuestLimited && isOnline) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                />
                                {!isGuestLimited && (
                                    <View style={{ alignSelf: 'flex-end', marginTop: 4, marginRight: 16 }}>
                                        <Text style={[styles.charCountText, input.length >= 280 && styles.charCountTextLimit]}>
                                            {input.length}/280
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Pressable
                                style={[
                                    styles.sendButton,
                                    (!input.trim() || isGuestLimited || !isOnline) && styles.sendButtonDisabled,
                                    !isGuestLimited && { marginBottom: 22 }
                                ]}
                                onPress={() => handleSend()}
                                disabled={!input.trim() || isLoading || isGuestLimited || !isOnline}
                            >
                                <Send size={20} color="#FFF" />
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    body: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebarWrapper: {
        // Holds both the sidebar panel and the pull-tab
        flexDirection: 'row',
        position: 'relative',
    },
    sidebar: {
        width: 200,
        backgroundColor: '#FFFFFF',
        paddingTop: 14,
        paddingHorizontal: 10,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
    },
    collapseTab: {
        width: 18,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderTopRightRadius: 6,
        borderBottomRightRadius: 6,
        borderWidth: 1,
        borderLeftWidth: 0,
        borderColor: theme.colors.border,
        alignSelf: 'center',
        marginLeft: -1,
    },
    collapseTabCollapsed: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    sidebarNewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
        paddingVertical: 9,
        paddingHorizontal: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    sidebarNewBtnText: {
        color: theme.colors.text,
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    sidebarHeading: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textLight,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
    },
    sessionItem: {
        borderRadius: 8,
        paddingVertical: 9,
        paddingHorizontal: 10,
        marginBottom: 3,
    },
    sessionItemActive: {
        backgroundColor: theme.colors.subtle,
        borderLeftWidth: 2,
        borderLeftColor: theme.colors.primaryLight,
    },
    sessionTitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    sessionTitleActive: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    sessionDate: {
        fontSize: 10,
        color: theme.colors.textLight,
        marginTop: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 3,
            },
            web: {
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            } as any
        })
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 4,
    },

    brandingCenterContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    brandingLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandingYarn: {
        width: 60,
        height: 60,
    },
    brandingKnot: {
        fontFamily: 'Lovingly',
        color: theme.colors.primary,
        marginTop: 15,
        fontWeight: 'bold',
        fontSize: 28,
    },
    brandingBloom: {
        fontFamily: 'Lovingly',
        color: theme.colors.secondary,
        marginTop: 15,
        fontWeight: 'bold',
        fontSize: 28,
    },
    brandingSubtitle: {
        color: theme.colors.textLight,
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
    },
    botImage: {
        width: '100%',
        height: '100%',
        borderRadius: 999,
        resizeMode: 'cover',
    },
    statusIndicatorContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        position: 'relative',
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.success,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statusText: {
        fontSize: 12,
        color: theme.colors.success,
        fontWeight: '500',
    },
    keyboardView: {
        flex: 1,
    },
    contentWrapper: {
        flex: 1,
        width: '100%',
        maxWidth: 800,
        alignSelf: 'center',
    },
    chatArea: {
        flex: 1,
    },
    chatList: {
        flexGrow: 1,
        justifyContent: 'flex-end',
        padding: 16,
        paddingBottom: 24,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    messageRowUser: {
        justifyContent: 'flex-end',
    },
    messageRowAssistant: {
        justifyContent: 'flex-start',
    },
    avatarAssistant: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    avatarUser: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    messageContentAssistant: {
        alignItems: 'flex-start',
        maxWidth: '75%',
    },
    messageContentUser: {
        alignItems: 'flex-end',
        maxWidth: '75%',
    },
    messageBubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    messageBubbleAssistant: {
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...Platform.select({
            web: { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' } as any,
            default: { elevation: 1 }
        })
    },
    messageBubbleUser: {
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    messageTextAssistant: {
        color: theme.colors.text,
    },
    messageTextUser: {
        color: '#FFF',
    },
    timestamp: {
        fontSize: 11,
        color: theme.colors.textLight,
        marginTop: 4,
        marginHorizontal: 4,
    },
    timestampAssistant: {
        alignSelf: 'flex-start',
    },
    timestampUser: {
        alignSelf: 'flex-end',
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    typingBubble: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        gap: 4,
        ...Platform.select({
            web: { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' } as any,
            default: { elevation: 1 }
        })
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.textLight,
    },
    quickRepliesContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    quickReplyChip: {
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.primaryLight,
        marginRight: 8,
    },
    quickReplyText: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        borderTopColor: theme.colors.border,
        borderBottomLeftRadius: Platform.OS === 'web' ? 12 : 0,
        borderBottomRightRadius: Platform.OS === 'web' ? 12 : 0,
        alignItems: 'flex-end',
        marginBottom: 40
    },
    input: {
        backgroundColor: theme.colors.subtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 14 : 12,
        paddingBottom: Platform.OS === 'ios' ? 14 : 12,
        fontSize: 15,
        color: theme.colors.text,
        textAlignVertical: 'top',
        ...Platform.select({
            web: { outlineStyle: 'none' } as any
        })
    },
    inputFocused: {
        borderColor: theme.colors.primary,
        backgroundColor: '#FFF',
    },
    inputDisabled: {
        backgroundColor: '#E9ECEF',
        color: theme.colors.textLight,
    },
    charCountContainer: {
        alignItems: 'flex-end',
        paddingHorizontal: 24,
        paddingBottom: 4,
    },
    charCountText: {
        fontSize: 12,
        color: theme.colors.textLight,
        fontWeight: '500',
    },
    charCountTextLimit: {
        color: '#DC3545',
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    sendButtonDisabled: {
        backgroundColor: theme.colors.border,
    },
    limitReachedContainer: {
        alignItems: 'center',
        marginVertical: 24,
        padding: 16,
        backgroundColor: theme.colors.primaryLight + '20',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.primaryLight,
    },
    limitReachedText: {
        color: theme.colors.text,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 20,
    },
    limitReachedButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
    },
    limitReachedButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    }
});
