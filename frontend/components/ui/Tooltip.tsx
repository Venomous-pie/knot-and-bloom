import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { CircleAlert } from 'lucide-react-native';

const SUB = '#6B7280';
const P = '#B36979'; // Brand primary
const Dark = '#1F2937';

interface TooltipProps {
    content: string;
    children?: React.ReactNode;
    iconColor?: string;
    iconSize?: number;
    position?: 'left' | 'right' | 'center';
}

export default function Tooltip({ content, children, iconColor = Dark, iconSize = 18, position = 'center' }: TooltipProps) {
    const [hovered, setHovered] = useState(false);
    const triggerRef = useRef<View>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, center: 0, right: 0, width: 0, height: 0, ready: false });

    const handleHoverIn = () => {
        setHovered(true);
        if (Platform.OS === 'web' && triggerRef.current) {
            triggerRef.current.measure((x, y, width, height, pageX, pageY) => {
                setCoords({ 
                    top: pageY,
                    left: pageX,
                    center: pageX + (width / 2),
                    right: pageX + width,
                    width,
                    height,
                    ready: true
                });
            });
        }
    };

    const handleHoverOut = () => {
        setHovered(false);
        setCoords(prev => ({ ...prev, ready: false }));
    };

    const getPositionStyles = () => {
        const offsetTop = coords.top + coords.height + 8;
        const triggerCenter = coords.left + coords.width / 2;
        const containerWidth = 220;

        let containerLeft = 0;

        switch (position) {
            case 'left':
                // Tooltip extends to the left (aligns its right edge with the trigger's right edge)
                containerLeft = (coords.left + coords.width) - containerWidth;
                break;
            case 'right':
                // Tooltip extends to the right (aligns its left edge with the trigger's left edge)
                containerLeft = coords.left;
                break;
            case 'center':
            default:
                // Tooltip is centered on the trigger
                containerLeft = triggerCenter - (containerWidth / 2);
                break;
        }

        // Optional viewport clamping (if window is available)
        if (typeof window !== 'undefined') {
            const screenWidth = window.innerWidth;
            if (containerLeft < 8) containerLeft = 8;
            if (containerLeft + containerWidth > screenWidth - 8) {
                containerLeft = screenWidth - containerWidth - 8;
            }
        }

        // The arrow must always point to the trigger center
        const arrowLeft = triggerCenter - containerLeft - 4; // -4 for half arrow width

        return { 
            container: { top: offsetTop, left: containerLeft, position: 'absolute' as any, opacity: coords.ready ? 1 : 0 }, 
            arrow: { left: arrowLeft, transform: [{ rotate: '45deg' }] as any } 
        };
    };

    const pos = getPositionStyles();

    const renderTooltipContent = () => {
        if (!hovered || Platform.OS !== 'web' || typeof window === 'undefined') return null;

        const contentNode = (
            <View style={[styles.tooltipContainer, pos.container]}>
                <View style={[styles.tooltipArrow, pos.arrow]} />
                <Text style={styles.tooltipText}>{content}</Text>
            </View>
        );

        try {
            const ReactDOM = require('react-dom');
            return ReactDOM.createPortal(contentNode, document.body);
        } catch (e) {
            return contentNode;
        }
    };

    return (
        <View style={styles.container} ref={triggerRef}>
            <Pressable
                onHoverIn={handleHoverIn}
                onHoverOut={handleHoverOut}
                style={styles.trigger}
            >
                {children || <CircleAlert size={iconSize} color={iconColor} />}
                {renderTooltipContent()}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        zIndex: 9999,
    },
    trigger: {
        padding: 4,
        position: 'relative',
        zIndex: 9999,
    },
    tooltipContainer: {
        backgroundColor: '#1F2937',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        width: 220,
        zIndex: 999999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    tooltipArrow: {
        position: 'absolute',
        top: -4,
        width: 8,
        height: 8,
        backgroundColor: '#1F2937',
    },
    tooltipText: {
        color: '#F9FAFB',
        fontSize: 12,
        fontFamily: 'Quicksand',
        textAlign: 'left',
        lineHeight: 18,
    },
});
