import BespokeAuthForm from '@/components/auth/BespokeAuthForm';
import { theme } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginPage() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <BespokeAuthForm initialMode="login" />
        </SafeAreaView>
    );
}
