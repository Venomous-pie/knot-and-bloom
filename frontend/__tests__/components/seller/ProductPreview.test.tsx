import React from 'react';
import { render } from '@testing-library/react-native';
import ProductPreview from '../../../components/seller/ProductPreview';

jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));

describe('ProductPreview', () => {
    const baseProps = {
        name: 'Test Product',
        description: 'Test Description',
        basePrice: '100',
        discountPercentage: '0',
        image: 'base-image.jpg',
        images: [{ uri: 'base-image.jpg' }],
        categories: ['Category 1'],
        variants: [],
    };

    it('should calculate and display the lowest price among variants', () => {
        const { getByText } = render(
            <ProductPreview
                {...baseProps}
                basePrice="100"
                variants={[
                    { name: 'Variant A', price: '120', discountPercentage: '0', stock: '5' },
                    { name: 'Variant B', price: '80', discountPercentage: '0', stock: '5' },
                    { name: 'Variant C', price: '', discountPercentage: '0', stock: '5' }, // inherits 100
                ]}
            />
        );

        // Lowest price is 80
        expect(getByText('₱80.00')).toBeTruthy();
    });

    it('should fall back to base price when variants have empty or null prices', () => {
        const { getByText } = render(
            <ProductPreview
                {...baseProps}
                basePrice="150"
                variants={[
                    { name: 'Variant A', price: '', discountPercentage: '0', stock: '5' },
                    { name: 'Variant B', price: '', discountPercentage: '0', stock: '5' },
                ]}
            />
        );

        // Falls back to basePrice 150
        expect(getByText('₱150.00')).toBeTruthy();
    });

    it('should fall back to base price when there are zero variants', () => {
        const { getByText } = render(
            <ProductPreview
                {...baseProps}
                basePrice="200"
                variants={[]}
            />
        );

        expect(getByText('₱200.00')).toBeTruthy();
    });

    it('should calculate final price using discount percentage', () => {
        const { getByText } = render(
            <ProductPreview
                {...baseProps}
                basePrice="100"
                discountPercentage="20"
                variants={[]}
            />
        );

        // 100 - 20% = 80
        expect(getByText('₱80.00')).toBeTruthy();
        // Original price should be struck through
        expect(getByText('₱100.00')).toBeTruthy();
        expect(getByText('-20%')).toBeTruthy();
    });

    it('should render correct number of pagination dots for media count (up to 5)', () => {
        const { getByTestId } = render(
            <ProductPreview
                {...baseProps}
                images={[
                    { uri: 'img1.jpg' },
                    { uri: 'img2.jpg' },
                    { uri: 'img3.jpg' },
                    { uri: 'img4.jpg' },
                    { uri: 'img5.jpg' },
                    { uri: 'img6.jpg' },
                ]}
            />
        );

        const paginationContainer = getByTestId('pagination-dots');
        // React Native Testing Library returns the View and its children
        expect(paginationContainer.children.length).toBe(5); // Capped at 5 dots
    });
});
