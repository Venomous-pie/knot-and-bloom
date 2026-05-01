import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ImageUploader from '../../../components/seller/ImageUploader';
import * as ImagePicker from 'expo-image-picker';
import { uploadToImageKit } from '../../../lib/imagekit';

// Mock dependencies
jest.mock('expo-image-picker', () => ({
    launchImageLibraryAsync: jest.fn(),
    MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('../../../lib/imagekit', () => ({
    compressImage: jest.fn((uri) => Promise.resolve(uri + '-compressed')),
    uploadToImageKit: jest.fn(),
}));

jest.mock('../../../components/seller/ImageCropperModal', () => {
    const { View, Pressable } = require('react-native');
    return function MockImageCropperModal(props: any) {
        if (!props.visible) return null;
        return (
            <View testID="mock-crop-modal">
                <Pressable testID="mock-crop-skip-btn" onPress={props.onSkip} />
                <Pressable testID="mock-crop-cancel-btn" onPress={props.onCancel} />
            </View>
        );
    };
});

const mockConfirm = jest.fn();
jest.mock('../../../contexts/DialogContext', () => ({
    useDialog: () => ({ confirm: mockConfirm }),
}));

describe('ImageUploader', () => {
    let mockOnImagesChange: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockOnImagesChange = jest.fn();
        mockConfirm.mockResolvedValue(true);
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'local-uri-1', fileName: 'test1.jpg', fileSize: 1024 }],
        });
        (uploadToImageKit as jest.Mock).mockResolvedValue({ url: 'https://imagekit.io/test1.jpg' });
    });

    it('should upload successfully and append to images array', async () => {
        const { getByText } = render(
            <ImageUploader images={[]} onImagesChange={mockOnImagesChange} />
        );

        await act(async () => {
            fireEvent.press(getByText('Upload Product Images'));
        });

        expect(uploadToImageKit).toHaveBeenCalled();
        expect(mockOnImagesChange).toHaveBeenCalledWith([
            { uri: 'https://imagekit.io/test1.jpg', isUrl: true },
        ]);
    });

    it('should degrade gracefully on upload failure (returns local uri)', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (uploadToImageKit as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));

        const { getByText } = render(
            <ImageUploader images={[]} onImagesChange={mockOnImagesChange} />
        );

        await act(async () => {
            fireEvent.press(getByText('Upload Product Images'));
        });

        // Still appends the local URI so the user doesn't lose the image
        expect(mockOnImagesChange).toHaveBeenCalledWith([
            { uri: 'local-uri-1', isUrl: false },
        ]);

        consoleErrorSpy.mockRestore();
    });

    it('should handle picker cancellation gracefully without modifying state', async () => {
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
            canceled: true,
        });

        const { getByText } = render(
            <ImageUploader images={[]} onImagesChange={mockOnImagesChange} />
        );

        await act(async () => {
            fireEvent.press(getByText('Upload Product Images'));
        });

        expect(uploadToImageKit).not.toHaveBeenCalled();
        expect(mockOnImagesChange).not.toHaveBeenCalled();
    });

    it('should remove image and verify array identity', async () => {
        const initialImages = [
            { uri: 'img1.jpg', isUrl: true },
            { uri: 'img2.jpg', isUrl: true },
            { uri: 'img3.jpg', isUrl: true },
        ];

        // We use queryAllByRole or testIDs to find the trash button.
        // ImageUploader has a Pressable with styles.deleteButton.
        // Let's just find by the Trash2 icon if we had test IDs, but wait, we can mock Dialog
        // and trigger the delete by finding the button. Let's add a testID to the delete button in the component.
        const { getAllByTestId } = render(
            <ImageUploader images={initialImages} onImagesChange={mockOnImagesChange} />
        );

        const deleteButtons = getAllByTestId('delete-image-btn');
        expect(deleteButtons.length).toBe(3);

        await act(async () => {
            fireEvent.press(deleteButtons[1]); // Remove the second image
        });

        expect(mockConfirm).toHaveBeenCalled();
        
        // Assert mockOnImagesChange called with a NEW array, minus the second item
        const newArray = mockOnImagesChange.mock.calls[0][0];
        expect(newArray).not.toBe(initialImages); // Array identity check
        expect(newArray.length).toBe(2);
        expect(newArray).toEqual([
            { uri: 'img1.jpg', isUrl: true },
            { uri: 'img3.jpg', isUrl: true },
        ]);
    });

    it('should handle crop flow when skipped', async () => {
        const initialImages = [{ uri: 'img1.jpg', isUrl: true }];
        
        const { getAllByTestId, getByTestId, queryByTestId } = render(
            <ImageUploader images={initialImages} onImagesChange={mockOnImagesChange} />
        );

        const cropButtons = getAllByTestId('crop-image-btn');
        
        await act(async () => {
            fireEvent.press(cropButtons[0]);
        });

        // Crop modal should be visible
        expect(getByTestId('mock-crop-modal')).toBeTruthy();

        // Simulate skip
        await act(async () => {
            fireEvent.press(getByTestId('mock-crop-skip-btn'));
        });

        // Modal closed, images array untouched
        expect(queryByTestId('mock-crop-modal')).toBeNull();
        expect(mockOnImagesChange).not.toHaveBeenCalled();
    });
});
