import { productAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/types/products";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";

export default function Index() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await productAPI.getProducts({ limit: 10, newArrival: true });
      setProducts(res.data.products);
    } catch (e) {
      console.error("Failed to load products", e);
    } finally {
      setLoading(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Knot & Bloom</Text>
        <View style={styles.headerActions}>
          {user?.role === 'ADMIN' && (
            <Pressable
              style={styles.adminBtn}
              onPress={() => router.push('/manage-products')}
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
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item.uid.toString()}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
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
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});