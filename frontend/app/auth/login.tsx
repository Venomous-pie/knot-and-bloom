import BespokeAuthForm from '@/components/auth/BespokeAuthForm';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginPage() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFAF9' }}>
            <BespokeAuthForm initialMode="login" />
        </SafeAreaView>
    );
}
