import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from '../ui/Skeleton';

// Skeleton for LiveHeroCard
function HeroCardSkeleton() {
    return (
        <View className="mr-4 w-[320px] rounded-3xl border border-border bg-surface p-8">
            {/* Top Meta Row */}
            <View className="mb-4 flex-row items-center justify-between">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-24 rounded" />
            </View>

            {/* VS Teams Row */}
            <View className="mb-5 flex-row items-center justify-between">
                <View className="flex-1 items-center gap-2">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded" />
                </View>

                <Skeleton className="h-3 w-6 rounded" />

                <View className="flex-1 items-center gap-2">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded" />
                </View>
            </View>

            {/* Watch Button */}
            <Skeleton className="h-12 w-full rounded-2xl" />
        </View>
    );
}

// Skeleton for LeagueFilterRow
function LeagueFilterSkeleton() {
    return (
        <View className="mb-6 flex-row gap-2.5 px-4">
            {[1, 2, 3, 4].map((key) => (
                <Skeleton key={key} className="h-10 w-24 rounded-full" />
            ))}
        </View>
    );
}

// Skeleton for MatchCard
function MatchCardSkeleton() {
    return (
        <View className="mb-3 rounded-2xl border border-border bg-surface p-4">
            {/* Top League / Time Row */}
            <View className="mb-4 flex-row items-center justify-between">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-3.5 w-16 rounded" />
            </View>

            {/* Match Teams Row */}
            <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-12 rounded" />
                </View>

                <Skeleton className="h-3 w-6 rounded" />

                <View className="flex-1 flex-row items-center justify-end gap-3">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </View>
            </View>
        </View>
    );
}

// Full Dashboard Skeleton Screen
export function DashboardSkeleton() {
    return (
        <View className="flex-1 bg-void pt-2 px-4">
            {/* Hero Carousel Skeleton */}
            <View className="mb-6">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false}>
                    <HeroCardSkeleton />
                    <HeroCardSkeleton />
                </ScrollView>
            </View>

            {/* League Filters Skeleton */}
            <LeagueFilterSkeleton />

            {/* Live Section Header & Cards */}
            {/* <Skeleton className="mb-3 h-5 w-28 rounded" /> */}
            <MatchCardSkeleton />
            <MatchCardSkeleton />

            {/* Upcoming Section Header & Cards */}
            {/* <Skeleton className="mb-3 mt-4 h-5 w-32 rounded" /> */}
            <MatchCardSkeleton />
            <MatchCardSkeleton />
        </View>
    );
}