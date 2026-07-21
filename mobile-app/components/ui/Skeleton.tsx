import React, { useEffect, useRef } from 'react';
import { Animated, ViewProps } from 'react-native';

interface SkeletonProps extends ViewProps {
    className?: string;
}

export function Skeleton({ className = '', style, ...props }: SkeletonProps) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );

        pulse.start();

        return () => pulse.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[{ opacity }, style]}
            className={`bg-surface-elevated rounded-xl ${className}`}
            {...props}
        />
    );
}