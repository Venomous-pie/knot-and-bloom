import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import Tooltip from './Tooltip';

const CARD = '#FFFFFF';
const TEXT = '#1A1A2E';
const SUB = '#6B7280';
const BORDER = '#F0F0F5';
const GREEN = '#10B981';
const RED = '#EF4444';
const P = '#B36979';

export interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    sub?: string;
    trend?: 'up' | 'down' | null;
    tooltip?: string;
    isLoading?: boolean;
}

export default function StatCard({ label, value, icon, color, sub, trend, tooltip, isLoading }: StatCardProps) {
    const scale = useRef(new Animated.Value(1)).current;
    
    return (
        <View style={{ flex: 1, minWidth: 140, zIndex: 99, overflow: 'visible' }}>
            <Pressable onPress={() => {
                Animated.sequence([
                    Animated.timing(scale, { toValue: 0.95, duration: 70, useNativeDriver: true }),
                    Animated.timing(scale, { toValue: 1, duration: 70, useNativeDriver: true }),
                ]).start();
            }} style={{ zIndex: 99, overflow: 'visible' }}>
                <View style={{ position: 'relative', zIndex: 99, overflow: 'visible' }}>
                    <Animated.View style={[styles.statCard, { transform: [{ scale }] }]}>
                        <View style={styles.statCardHeader}>
                            <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>{icon}</View>
                            {tooltip && <Tooltip content={tooltip} iconColor={SUB} iconSize={18} position="right" />}
                        </View>
                        {isLoading ? (
                            <View style={{ height: 28, width: 80, backgroundColor: '#E2E8F0', borderRadius: 6, marginVertical: 2 }} />
                        ) : (
                            <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'nowrap' }}>
                            <Text style={[styles.statLbl, { marginTop: 0, lineHeight: 20 }]}>{label}</Text>
                            {trend && (
                                <View style={[styles.trendBadge, { backgroundColor: trend === 'up' ? '#DCFCE7' : '#FEE2E2' }]}>
                                    {trend === 'up' && <TrendingUp size={10} color={GREEN} />}
                                    {trend === 'down' && <TrendingDown size={10} color={RED} />}
                                </View>
                            )}
                        </View>
                        {sub && <Text style={[styles.statSub, { marginTop: 4 }]}>{sub}</Text>}
                    </Animated.View>
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    statCard: { backgroundColor: CARD, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: BORDER },
    statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, height: 20 },
    statVal: { fontSize: 24, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand' },
    statLbl: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 4, fontWeight: '500' },
    statSub: { fontSize: 11, color: SUB, fontFamily: 'Quicksand' },
});
