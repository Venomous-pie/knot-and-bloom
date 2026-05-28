import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import VariantEditor from '../../../components/seller/VariantEditor';
import { useDialog } from '../../../contexts/DialogContext';

jest.mock('../../../contexts/DialogContext', () => ({
    useDialog: jest.fn(),
}));

jest.mock('../../../components/seller/ImageUploader', () => {
    const { View } = require('react-native');
    return function MockImageUploader() {
        return <View testID="mock-image-uploader" />;
    };
});

describe('VariantEditor', () => {
    let mockOnVariantsChange: jest.Mock;
    let mockOnGenerateVariantSku: jest.Mock;
    let mockConfirm: jest.Mock;

    const baseProps = {
        baseSku: 'TEST-SKU',
        basePrice: '100',
        baseDiscount: '0',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockOnVariantsChange = jest.fn();
        mockOnGenerateVariantSku = jest.fn();
        mockConfirm = jest.fn().mockResolvedValue(true);
        (useDialog as jest.Mock).mockReturnValue({ confirm: mockConfirm });
    });

    const defaultVariants: any[] = [
        { uid: 1, stock: '5', sku: 'TEST-SKU-1', price: '', discountPercentage: '', images: [], options: { 'Size': 'Default' }, isEnabled: true }
    ];

    it('should filter stock input to strictly integers', () => {
        const { getByPlaceholderText } = render(
            <VariantEditor
                {...baseProps}
                variants={defaultVariants}
                productOptions={[]}
                onProductOptionsChange={jest.fn()}
                onVariantsChange={mockOnVariantsChange}
            />
        );

        const stockInput = getByPlaceholderText('0');
        
        // Try typing a decimal
        fireEvent.changeText(stockInput, '5.5');
        
        // handleNumericInput should strip non-digits for stock (allowDecimal=false)
        expect(mockOnVariantsChange).toHaveBeenCalledWith([
            { ...defaultVariants[0], stock: '55' }
        ]);

        // Try typing letters
        fireEvent.changeText(stockInput, 'abc12');
        
        expect(mockOnVariantsChange).toHaveBeenCalledWith([
            { ...defaultVariants[0], stock: '12' }
        ]);
    });

    it('should fall back to base price visually but allow price overrides', () => {
        const variantsWithSecond: any[] = [
            ...defaultVariants,
            { uid: 2, stock: '5', sku: 'TEST-SKU-2', price: '', discountPercentage: '', images: [], options: { 'Size': 'Second' }, isEnabled: true }
        ];

        const { getByPlaceholderText, getByText } = render(
            <VariantEditor
                {...baseProps}
                variants={variantsWithSecond} // price is ''
                productOptions={[]}
                onProductOptionsChange={jest.fn()}
                onVariantsChange={mockOnVariantsChange}
            />
        );

        // Expand the second variant
        fireEvent.press(getByText('Second'));

        // When price is empty, the placeholder should show "Inherits 100"
        const priceInput = getByPlaceholderText('Inherits 100');
        expect(priceInput.props.value).toBe('');

        // Override the price
        fireEvent.changeText(priceInput, '150');
        
        expect(mockOnVariantsChange).toHaveBeenCalledWith([
            variantsWithSecond[0],
            { ...variantsWithSecond[1], price: '150' }
        ]);
    });

    it('should remove variant when delete is confirmed, and prevent deleting the default variant', async () => {
        const variantsWithMultiple: any[] = [
            ...defaultVariants,
            { uid: 2, stock: '2', sku: 'TEST-SKU-2', price: '', discountPercentage: '', images: [], options: { 'Size': 'Second' }, isEnabled: true }
        ];

        const { queryAllByTestId } = render(
            <VariantEditor
                {...baseProps}
                variants={variantsWithMultiple}
                productOptions={[]}
                onProductOptionsChange={jest.fn()}
                onVariantsChange={mockOnVariantsChange}
            />
        );

        // Find the trash icon container. The first variant (index 0) shouldn't have one.
        const deleteBtns = queryAllByTestId('delete-variant-btn');
        expect(deleteBtns.length).toBe(1); // Only the second variant has a delete button

        await act(async () => {
            fireEvent.press(deleteBtns[0]);
        });

        expect(mockConfirm).toHaveBeenCalled();

        // Should emit an array with only the default variant left
        expect(mockOnVariantsChange).toHaveBeenCalledWith([defaultVariants[0]]);
    });

    it('should allow duplicate variant names without crashing', () => {
        // The first variant's name is locked to "Default", so we add two more variants
        // to test the text inputs.
        const duplicateVariants: any[] = [
            defaultVariants[0],
            { uid: 2, stock: '5', sku: 'SKU-R', price: '', discountPercentage: '', images: [], options: { 'Color': 'Red' }, isEnabled: true },
            { uid: 3, stock: '5', sku: 'SKU-R2', price: '', discountPercentage: '', images: [], options: { 'Color': 'Red' }, isEnabled: true },
        ];

        const { getAllByPlaceholderText, getAllByText } = render(
            <VariantEditor
                {...baseProps}
                variants={duplicateVariants}
                productOptions={[]}
                onProductOptionsChange={jest.fn()}
                onVariantsChange={mockOnVariantsChange}
            />
        );

        // Expand the second variant (index 1) so its input renders
        // getAllByText('Red') will find the summary texts. We press the first one.
        fireEvent.press(getAllByText('Red')[0]); 
        
        const nameInputs = getAllByPlaceholderText('e.g. Small Red, Blue XL');
        
        // Modify the first editable 'Red' input
        fireEvent.changeText(nameInputs[0], 'Blue');

        expect(mockOnVariantsChange).toHaveBeenCalledWith([
            duplicateVariants[0],
            { ...duplicateVariants[1], options: { ...duplicateVariants[1].options, 'Color': 'Blue' } },
            duplicateVariants[2]
        ]);
    });
});
