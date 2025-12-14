import React from "react";
import { Text, View } from "react-native";

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
};

interface ProductPageProps {
    category: string;
    title: string;
};

export default function ProductPage({ category, title }: ProductPageProps) {
    return (
        <View>
            <Text>{title}</Text>
            <Text>Category: {category}</Text>
        </View>
    );
}