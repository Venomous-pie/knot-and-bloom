import { useAuth } from "@/app/auth";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";

export default function Index() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  // Use centralized hook for data fetching
  const { products, loading } = useProducts({
    limit: 10,
    newArrival: true
  });

  const getNumColumns = () => {
    if (width > 1024) return 8;
    if (width > 768) return 3;
    return 2;
  };

  const numColumns = getNumColumns();
  const gap = 8;
  const cardWidth = (width - 32 - (numColumns - 1) * gap) / numColumns;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Knot & Bloom</Text>
        <View style={styles.headerActions}>
          {user?.role === 'ADMIN' && (
            <Pressable
              style={styles.adminBtn}
              onPress={() => router.push('/admin')}
            >
              <Text style={styles.adminBtnText}>Admin</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/cart')}>
            <Text style={{ fontSize: 24 }}>🛒</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>New Arrivals</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#B36979" />
        ) : (
          <FlatList
            key={`grid-${numColumns}`}
            data={products}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                style={{ width: cardWidth }}
              />
            )}
            keyExtractor={(item) => item.uid.toString()}
            numColumns={numColumns}
            columnWrapperStyle={[styles.columnWrapper, { gap }]}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text>No products yet.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#B36979',
    fontFamily: 'serif',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  adminBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adminBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
    borderWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
});