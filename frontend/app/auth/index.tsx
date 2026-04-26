import { Redirect } from 'expo-router';

// The /auth route redirects to /auth/login by default
export default function AuthIndex() {
    return <Redirect href="/auth/login" />;
}
