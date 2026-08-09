import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';
import Footer from '@/components/home/Footer';
import Button from '@/components/ui/Button';
import { Search } from 'lucide-react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops! Page Not Found' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Text style={styles.title}>404</Text>
          <Text style={styles.subtitle}>Oh no! We couldn't find that page.</Text>
          <Text style={styles.body}>
            The knot might have slipped or the bloom hasn't grown yet.
          </Text>

          <View style={styles.buttonContainer}>
            <Button 
              title="Return Home"
              onPress={() => router.replace('/')}
            />

            <Button 
              title="Search the Shop"
              variant="outline"
              icon={<Search size={18} color={theme.colors.primary} />}
              onPress={() => router.replace('/search')}
            />
          </View>
        </View>

        {/* Keeping the user flow seamless by including the standard footer */}
        <Footer />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: 500, // Ensure it takes up enough vertical space before the footer
  },
  title: {
    fontSize: 84,
    fontWeight: '800',
    color: theme.colors.primary,
    fontFamily: 'Quicksand',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'Quicksand',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontFamily: 'Quicksand',
    marginBottom: 36,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
