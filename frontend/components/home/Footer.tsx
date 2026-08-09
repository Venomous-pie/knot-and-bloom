import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, TextInput } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';

// Theme aliases for the "Stitched Ledger" design
const P = theme.colors.primary; // Rose
const S = theme.colors.secondary; // Pine
const BG = theme.colors.background; // Bone
const TEXT = theme.colors.text; // Ink
const GOLD = theme.colors.warning; // Gold/Amber

export default function Footer() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();
  const [email, setEmail] = useState('');

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { paddingHorizontal: isMobile ? 22 : 48 }]}>
        {/* TOP SECTION */}
        <View style={[styles.top, isMobile && styles.topMobile]}>
          <View style={styles.brandBlock}>
            <Text style={styles.mark}>Knot & Bloom</Text>
            <Text style={styles.tag}>a knot tied with care, a bloom grown with time</Text>
          </View>
          
          <View style={[styles.tagbox, isMobile && styles.tagboxMobile]}>
            <View style={styles.tagboxHole} />
            <Text style={styles.label}>Maker's Almanac</Text>
            <Text style={styles.copy}>New drops from verified makers, once every fortnight.</Text>
            <View style={styles.form}>
              <TextInput 
                style={styles.input} 
                placeholder="your@email.com" 
                placeholderTextColor={`${TEXT}80`}
                value={email}
                onChangeText={setEmail}
              />
              <Pressable style={({ hovered, pressed }) => [
                styles.button,
                (hovered || pressed) && { opacity: 0.9 }
              ] as any}>
                <Text style={styles.buttonText}>Join</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* DIVIDER (Stitch equivalent) */}
        <View style={styles.stitchContainer}>
          <View style={styles.stitch} />
        </View>

        {/* COLUMNS */}
        <View style={[styles.cols, isMobile && styles.colsMobile]}>
          <View style={styles.col}>
            <Text style={styles.colHeader}>Shop</Text>
            <Pressable onPress={() => router.push('/search?category=stuffed-toys')}>
              {({ hovered }) => <Text style={[styles.link, hovered && styles.linkHover]}>Toys</Text>}
            </Pressable>
            <Pressable onPress={() => router.push('/search?category=wire-flowers')}>
              {({ hovered }) => <Text style={[styles.link, hovered && styles.linkHover]}>Flowers</Text>}
            </Pressable>
            <Pressable onPress={() => router.push('/search?category=keychains')}>
              {({ hovered }) => <Text style={[styles.link, hovered && styles.linkHover]}>Keychains</Text>}
            </Pressable>
          </View>

          <View style={styles.col}>
            <Text style={styles.colHeader}>Info</Text>
            <Pressable onPress={() => router.push('/about-shop' as any)}>
              {({ hovered }) => <Text style={[styles.link, hovered && styles.linkHover]}>About Shop</Text>}
            </Pressable>
            <Pressable onPress={() => router.push('/makers' as any)}>
              {({ hovered }) => <Text style={[styles.link, hovered && styles.linkHover]}>Custom Order</Text>}
            </Pressable>
            <Pressable onPress={() => router.push('/contact-us' as any)}>
              {({ hovered }) => <Text style={[styles.link, hovered && styles.linkHover]}>Contact Us</Text>}
            </Pressable>
            <Pressable onPress={() => router.push('/customer-service' as any)}>
              {({ hovered }) => <Text style={[styles.link, hovered && styles.linkHover]}>FAQs & Shipping</Text>}
            </Pressable>
          </View>

          <View style={styles.col}>
            <Text style={styles.colHeader}>Socials</Text>
            <View style={styles.socials}>
              {['IG', 'FB', 'TT'].map((social) => (
                <Pressable key={social} style={({ hovered }) => [
                  styles.socialBtn,
                  hovered && styles.socialBtnHover
                ] as any}>
                  {({ hovered }) => (
                    <Text style={[styles.socialText, hovered && styles.socialTextHover]}>{social}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* BOTTOM */}
        <View style={styles.bottom}>
          <Text style={styles.trust}>Every piece verified handmade</Text>
          <Text style={styles.copyright}>© {new Date().getFullYear()} Knot & Bloom. All rights reserved.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: BG,
    width: '100%',
    paddingVertical: 20,
  },
  container: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingTop: 36,
    paddingBottom: 8,
    borderRadius: 4,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 40,
    flexWrap: 'wrap',
  },
  topMobile: {
    flexDirection: 'column',
    gap: 26,
  },
  brandBlock: {
    flex: 1,
  },
  mark: {
    fontFamily: 'Lovingly',
    fontSize: 34,
    color: P,
  },
  tag: {
    fontFamily: 'Quicksand',
    fontStyle: 'italic',
    fontSize: 14,
    color: TEXT,
    opacity: 0.65,
    marginTop: 6,
  },
  tagbox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: `${TEXT}25`,
    borderRadius: 6,
    paddingTop: 18,
    paddingHorizontal: 22,
    paddingBottom: 16,
    width: 280,
    position: 'relative',
  },
  tagboxMobile: {
    width: '100%',
  },
  tagboxHole: {
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: [{ translateX: -7 }],
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: `${TEXT}25`,
  },
  label: {
    fontFamily: 'Quicksand',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: S,
    fontWeight: '700',
    marginBottom: 6,
  },
  copy: {
    fontFamily: 'Quicksand',
    fontSize: 12.5,
    color: TEXT,
    opacity: 0.75,
    marginBottom: 12,
    lineHeight: 18,
  },
  form: {
    flexDirection: 'row',
    gap: 6,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: `${TEXT}25`,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    fontFamily: 'Quicksand',
    backgroundColor: BG,
    color: TEXT,
  },
  button: {
    backgroundColor: S,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Quicksand',
  },
  stitchContainer: {
    height: 1,
    overflow: 'hidden',
    marginVertical: 40,
    opacity: 0.28,
  },
  stitch: {
    width: '100%',
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    borderColor: TEXT,
  },
  cols: {
    flexDirection: 'row',
    gap: 32,
  },
  colsMobile: {
    flexDirection: 'column',
    gap: 26,
  },
  col: {
    flex: 1,
  },
  colHeader: {
    fontFamily: 'Quicksand',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
    color: GOLD,
    marginBottom: 14,
  },
  link: {
    fontFamily: 'Quicksand',
    color: TEXT,
    fontSize: 14,
    opacity: 0.82,
    marginBottom: 12,
  },
  linkHover: {
    opacity: 1,
    color: P,
  },
  socials: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  socialBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: TEXT,
    opacity: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnHover: {
    backgroundColor: P,
    borderColor: P,
    opacity: 1,
  },
  socialText: {
    fontFamily: 'Quicksand',
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
  },
  socialTextHover: {
    color: '#fff',
  },
  bottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: `${TEXT}15`,
    gap: 10,
  },
  trust: {
    fontFamily: 'Quicksand',
    fontSize: 12,
    color: S,
    fontWeight: '600',
  },
  copyright: {
    fontFamily: 'Quicksand',
    fontSize: 12,
    color: TEXT,
    opacity: 0.5,
  }
});
