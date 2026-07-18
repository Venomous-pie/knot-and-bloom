import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Image,
    Animated,
    Dimensions
} from 'react-native';
import { theme } from '@/constants/theme';
import { Send, User, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react-native';
import { chatAPI, productAPI } from '@/api/api';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    type?: 'text' | 'limit_reached';
}

const WELCOME_MESSAGE: Message = {
    id: 'welcome',
    role: 'assistant',
    content: 'Hello! I am the Knot & Bloom Customer Assistant. How can I help you today?',
    timestamp: new Date().toISOString()
};

function getSessionsKey(userId?: number | string | null): string {
    return userId ? `chat_sessions_user_${userId}` : 'chat_sessions_guest';
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

export default function GlobalAIChat() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();

    // Check if we should hide the global chat
    const isBespokePage = pathname?.includes('/auth') ||
        pathname?.includes('/secure') ||
        pathname?.includes('/seller/apply') ||
        pathname?.includes('/seller/application-') ||
        pathname?.includes('/customer-service/chat');

    // Panel state
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const slideAnim = useRef(new Animated.Value(350)).current; // 350 is the panel width

    // Chat state
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [inputHeight, setInputHeight] = useState(48);
    const [isLoading, setIsLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    const sessionsKey = getSessionsKey(user?.uid);

    // Slide animation
    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isOpen ? 0 : 350,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isOpen]);

    // Load recent messages
    useEffect(() => {
        const load = async () => {
            try {
                const raw = await AsyncStorage.getItem(sessionsKey);
                if (raw) {
                    const saved = JSON.parse(raw);
                    if (saved.length > 0 && saved[0].messages) {
                        setMessages(saved[0].messages);
                    }
                }
            } catch (e) {
                console.warn('Could not load sessions:', e);
            }
        };
        load();
    }, [sessionsKey]);

    // Save messages
    useEffect(() => {
        if (messages.length <= 1) return;
        const save = async () => {
            try {
                const session = {
                    id: 'global_session',
                    title: 'Current Conversation',
                    messages: messages,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await AsyncStorage.setItem(sessionsKey, JSON.stringify([session]));
            } catch (e) {
                console.warn('Could not save session:', e);
            }
        };
        save();
    }, [messages, sessionsKey]);

    // Online status check
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

    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
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
                    // Normal text
                }

                const assistantMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: replyContent,
                    timestamp: new Date().toISOString(),
                    type: replyType
                };
                setMessages(prev => [...prev, assistantMsg]);
            } else {
                throw new Error("Failed to get a response");
            }

        } catch (error) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I am having trouble connecting to the server right now. Please try again later.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
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
                                <Text key={index} style={{ textDecorationLine: 'underline', fontWeight: '500' }}>
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
                    <Pressable onPress={() => { setIsOpen(false); router.push('/auth' as any); }} style={styles.limitReachedButton}>
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
                        <User size={16} color="#FFF" />
                    </View>
                )}
            </View>
        );
    };

    // Only mount keyboard avoiding view if we are on mobile, or just use a standard view on web
    const ContainerComponent = Platform.OS === 'web' ? View : KeyboardAvoidingView;

    if (isBespokePage) return null;

    return (
        <>
            {isOpen && (
                <Pressable
                    style={[
                        StyleSheet.absoluteFill,
                        { zIndex: 9998 },
                        Platform.OS === 'web' ? { position: 'fixed' as any } : {}
                    ]}
                    onPress={() => setIsOpen(false)}
                />
            )}
            <Animated.View
                style={[
                    styles.globalContainer,
                    { transform: [{ translateX: slideAnim }] }
                ]}
            >
                {/* Pull Tab */}
                <Pressable
                    style={[
                        styles.pullTab, 
                        isOpen && styles.pullTabOpen,
                        !isOpen && !isHovered && styles.pullTabHidden
                    ]}
                    onPress={() => setIsOpen(!isOpen)}
                    onHoverIn={() => setIsHovered(true)}
                    onHoverOut={() => setIsHovered(false)}
                    hitSlop={{ top: 60, bottom: 60, left: 0, right: 0 }}
                >
                    {isOpen ? (
                        <ChevronRight size={20} color="#666" />
                    ) : (
                        <View style={[styles.pullTabIconContainer, !isHovered && { opacity: 0 }]}>
                            <ChevronLeft size={24} color="#FFF" />
                        </View>
                    )}
                </Pressable>

                {/* Chat Panel */}
                <View style={styles.panelContainer}>
                    {/* Header */}
                    <View style={styles.header}>
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

                    {/* Body */}
                    <ContainerComponent
                        style={styles.body}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={item => item.id}
                            renderItem={renderMessage}
                            contentContainerStyle={styles.chatList}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            ListFooterComponent={isLoading ? <TypingIndicator /> : null}
                        />

                        {/* Input Area */}
                        <View style={styles.inputContainer}>
                            <View style={styles.inputWrapper}>
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
                                    onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                                    placeholder={!isOnline ? "Support is offline" : isGuestLimited ? "Limit reached..." : "Message support..."}
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

                                {/* Inside Input Footer: Send Button & Char Limit */}
                                <View style={styles.inputFooter}>
                                    {!isGuestLimited && (
                                        <Text style={[styles.charCountText, input.length >= 280 && styles.charCountTextLimit]}>
                                            {input.length}/280
                                        </Text>
                                    )}
                                    <Pressable
                                        style={[
                                            styles.sendButton,
                                            (!input.trim() || isGuestLimited || !isOnline) && styles.sendButtonDisabled,
                                        ]}
                                        onPress={handleSend}
                                        disabled={!input.trim() || isLoading || isGuestLimited || !isOnline}
                                    >
                                        <Send size={16} color="#FFF" />
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </ContainerComponent>
                </View>
            </Animated.View>
        </>
    );
}

            const styles = StyleSheet.create({
                globalContainer: {
                position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 350,
            zIndex: 9999,
            flexDirection: 'row',
            ...Platform.select({
                web: {position: 'fixed' as any }
        })
    },
            pullTab: {
                position: 'absolute',
            left: -48,
            top: '50%',
            marginTop: -30,
            width: 48,
            height: 60,
            backgroundColor: theme.colors.primary,
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: {width: -2, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 5,
    },
            pullTabHidden: {
                backgroundColor: 'transparent',
                shadowOpacity: 0,
                elevation: 0,
                left: -12,
                width: 12,
            },
            pullTabOpen: {
                backgroundColor: '#FFF',
            left: -30,
            width: 30,
            height: 50,
            borderRightWidth: 1,
            borderRightColor: theme.colors.border,
            shadowOpacity: 0.05,
            shadowRadius: 2,
    },
            pullTabIconContainer: {
                alignItems: 'center',
            justifyContent: 'center',
    },
            panelContainer: {
                flex: 1,
            backgroundColor: '#F8F9FA',
            borderLeftWidth: 1,
            borderLeftColor: theme.colors.border,
            shadowColor: '#000',
            shadowOffset: {width: -5, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 10,
    },
            header: {
                flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: '#FFF',
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
    },
            headerTitleContainer: {
                flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
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
            body: {
                flex: 1,
    },
            chatList: {
                flexGrow: 1,
            padding: 16,
    },
            messageRow: {
                flexDirection: 'row',
            alignItems: 'flex-end',
            marginBottom: 16,
    },
            messageRowUser: {
                justifyContent: 'flex-end',
    },
            messageRowAssistant: {
                justifyContent: 'flex-start',
    },
            avatarAssistant: {
                width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.colors.primaryLight,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8,
            borderWidth: 1,
            borderColor: theme.colors.primary,
    },
            avatarUser: {
                width: 28,
            height: 28,
            borderRadius: 14,
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
                paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 18,
    },
            messageBubbleAssistant: {
                backgroundColor: '#FFF',
            borderBottomLeftRadius: 4,
            borderWidth: 1,
            borderColor: theme.colors.border,
    },
            messageBubbleUser: {
                backgroundColor: theme.colors.primary,
            borderBottomRightRadius: 4,
    },
            messageText: {
                fontSize: 14,
            lineHeight: 20,
    },
            messageTextAssistant: {
                color: theme.colors.text,
    },
            messageTextUser: {
                color: '#FFF',
    },
            timestamp: {
                fontSize: 10,
            marginTop: 4,
    },
            timestampAssistant: {
                color: theme.colors.textLight,
            marginLeft: 4,
    },
            timestampUser: {
                color: theme.colors.textLight,
            marginRight: 4,
    },
            typingContainer: {
                flexDirection: 'row',
            alignItems: 'flex-end',
            marginBottom: 16,
    },
            typingBubble: {
                backgroundColor: '#FFF',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 18,
            borderBottomLeftRadius: 4,
            borderWidth: 1,
            borderColor: theme.colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            height: 40,
    },
            dot: {
                width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.colors.textLight,
            marginHorizontal: 3,
    },
            inputContainer: {
                padding: 12,
            backgroundColor: '#FFF',
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            ...Platform.select({
                ios: {paddingBottom: 24 }
        })
    },
            inputWrapper: {
                backgroundColor: '#F9F9F9',
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 16,
            overflow: 'hidden',
    },
            input: {
                paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 40, // Space for footer
            fontSize: 14,
            color: theme.colors.text,
            maxHeight: 120,
            textAlignVertical: 'top',
            outlineStyle: 'none' as any,
    },
            inputFocused: {
                borderColor: theme.colors.primary,
            backgroundColor: '#FFF',
    },
            inputDisabled: {
                backgroundColor: '#F0F0F0',
            color: theme.colors.textLight,
    },
            inputFooter: {
                position: 'absolute',
            bottom: 8,
            left: 12,
            right: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
    },
            charCountText: {
                fontSize: 11,
            color: theme.colors.textLight,
    },
            charCountTextLimit: {
                color: '#DC3545',
            fontWeight: 'bold',
    },
            sendButton: {
                width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: theme.colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
    },
            sendButtonDisabled: {
                backgroundColor: theme.colors.textLight,
            opacity: 0.5,
    },
            limitReachedContainer: {
                backgroundColor: '#FFF3E0',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#FFE0B2',
    },
            limitReachedText: {
                color: '#E65100',
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 12,
            lineHeight: 20,
    },
            limitReachedButton: {
                backgroundColor: '#E65100',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 20,
    },
            limitReachedButtonText: {
                color: '#FFF',
            fontSize: 14,
            fontWeight: '600',
    },
});
