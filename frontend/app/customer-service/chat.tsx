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
    Animated,
    ScrollView,
    Image
} from 'react-native';
import { theme } from '@/constants/theme';
import { Send, Bot, User, ArrowLeft } from 'lucide-react-native';
import { chatAPI } from '@/api/api';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type?: 'text' | 'limit_reached';
}

const QUICK_REPLIES = [
    "Track my order",
    "Request a return",
    "Ask about a product",
    "Custom order inquiry"
];

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
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I am the Knot & Bloom Customer Assistant. How can I help you today?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [inputHeight, setInputHeight] = useState(48);
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const isGuestLimited = !user && messages.length >= 21;

    const handleSend = async (textToSend: string = input) => {
        const text = textToSend.trim();
        if (!text) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setInputHeight(48); // Reset height on send
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
                    // It's normal text, not JSON
                }

                const assistantMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: replyContent,
                    timestamp: new Date(),
                    type: replyType
                };
                setMessages(prev => [...prev, assistantMsg]);
            } else {
                throw new Error("Failed to get a response");
            }

        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I am having trouble connecting to the server right now. Please try again later.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                        <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAssistant]}>
                            {item.content}
                        </Text>
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
                        <View style={styles.statusDot} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Knot & Bloom Support</Text>
                        <Text style={styles.statusText}>Online</Text>
                    </View>
                </View>
                <View style={{ width: 24 }} /> {/* Spacer */}
            </View>

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
                            placeholder={isGuestLimited ? "Limit reached..." : "Type your message..."}
                            placeholderTextColor={theme.colors.textLight}
                            multiline
                            maxLength={500}
                            editable={!isGuestLimited}
                            onSubmitEditing={() => {
                                if (Platform.OS === 'web' && !isGuestLimited) {
                                    handleSend();
                                }
                            }}
                            onKeyPress={(e) => {
                                // Support Enter to send on web (Shift+Enter for newline)
                                if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !(e.nativeEvent as any).shiftKey && !isGuestLimited) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <Pressable 
                            style={[styles.sendButton, (!input.trim() || isGuestLimited) && styles.sendButtonDisabled]} 
                            onPress={() => handleSend()}
                            disabled={!input.trim() || isLoading || isGuestLimited}
                        >
                            <Send size={20} color="#FFF" />
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA', // Subtle background color instead of pure white
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'start',
        gap: 8,
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
        justifyContent: 'flex-end', // Anchors messages to the bottom
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
        flex: 1,
        backgroundColor: theme.colors.subtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 14 : 12,
        paddingBottom: Platform.OS === 'ios' ? 14 : 12,
        fontSize: 15,
        color: theme.colors.text,
        textAlignVertical: 'center',
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
