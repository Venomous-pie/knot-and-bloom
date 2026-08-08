import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StyleProp, ViewStyle, Platform, RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useRouter, RelativePathString } from 'expo-router';

interface ProfilePageLayoutProps {
    title: string;
    onBack?: () => void;
    rightAction?: React.ReactNode;
    children: React.ReactNode;
    scrollable?: boolean;
    contentStyle?: StyleProp<ViewStyle>;
    refreshControl?: React.ReactElement<RefreshControlProps>;
}

export const ProfilePageLayout: React.FC<ProfilePageLayoutProps> = ({
    title,
    onBack,
    rightAction,
    children,
    scrollable = true,
    contentStyle,
    refreshControl
}) => {
    const router = useRouter();
    
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.navigate('/profile' as RelativePathString);
        }
    };

    const content = scrollable ? (
        <ScrollView 
            contentContainerStyle={[styles.contentContainer, contentStyle]}
            refreshControl={refreshControl}
        >
            {children}
        </ScrollView>
    ) : (
        <View style={[styles.contentContainer, { flex: 1 }, contentStyle]}>
            {children}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={handleBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.rightActionContainer}>
                    {rightAction || <View style={{ width: 60 }} />}
                </View>
            </View>
            {content}
        </SafeAreaView>
    );
};

interface ProfileCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ children, style }) => (
    <View style={[styles.card, style]}>
        {children}
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: Platform.OS === 'web' ? 'Quicksand' : 'System',
    },
    rightActionContainer: {
        minWidth: 60,
        alignItems: 'flex-end',
    },
    contentContainer: {
        padding: 20,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
});
