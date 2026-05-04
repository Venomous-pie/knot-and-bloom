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
        switch (position) {
            case 'right':
                return { 
                    container: { top: offsetTop, left: coords.left - 180, position: 'absolute' as any, opacity: coords.ready ? 1 : 0 }, 
                    arrow: { right: 28, transform: [{ rotate: '45deg' }] as any } 
                };
            case 'left':
                return { 
                    container: { top: offsetTop, left: coords.left - 8, position: 'absolute' as any, opacity: coords.ready ? 1 : 0 }, 
                    arrow: { left: 12, transform: [{ rotate: '45deg' }] as any } 
                };
            case 'center':
            default:
                return { 
                    container: { top: offsetTop, left: coords.center, transform: [{ translateX: '-50%' }] as any, position: 'absolute' as any, opacity: coords.ready ? 1 : 0 },
                    arrow: { left: '50%' as any, transform: [{ translateX: '-50%' }, { rotate: '45deg' }] as any }
                };
        }
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
