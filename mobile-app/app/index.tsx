import { useRouter } from 'expo-router';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { ScrollView, BackHandler, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { LeagueFilterRow } from '@/components/dashboard/LeagueFilterRow';
import { LiveHeroCarousel } from '@/components/dashboard/LiveHeroCarousel';
import { MatchListSection } from '@/components/dashboard/MatchListSection';
import { EmptyMatchesState, ErrorState } from '@/components/dashboard/StatusStates';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { useMatches } from '@/context/MatchesContext';

export default function DashboardScreen() {
  const router = useRouter();
  const isNavigating = useRef(false);
  const {
    matches,
    leagues,
    scheduledMatchIds,
    setScheduledMatchIds,
    isLoading,
    error,
    filterMatchesByLeague,
    getLiveMatches,
    getUpcomingMatches,
    refreshData
  } = useMatches();

  const [selectedLeague, setSelectedLeague] = useState<string>('All');

  useEffect(() => {
    const backAction = () => {
      BackHandler.exitApp();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const filteredMatches = useMemo(
    () => filterMatchesByLeague(selectedLeague),
    [selectedLeague, matches],
  );
  const liveMatches = useMemo(() => getLiveMatches(selectedLeague), [filteredMatches]);
  const upcomingMatches = useMemo(() => getUpcomingMatches(selectedLeague), [filteredMatches]);

  const openMatch = useCallback((matchId: string) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.push({ pathname: '/match/[id]', params: { id: matchId } });
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  }, [router])

  // Helper function to render only the body content depending on screen state
  const renderContent = () => {
    if (isLoading) {
      return <DashboardSkeleton />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={refreshData} />;
    }

    if (!matches || matches.length === 0) {
      return <EmptyMatchesState onRefresh={refreshData} />;
    }

    return (
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-10"
      >
        <LiveHeroCarousel matches={liveMatches} onWatchMatch={openMatch} />
        <LeagueFilterRow
          leagues={leagues}
          selectedLeague={selectedLeague}
          onSelect={setSelectedLeague}
        />
        <MatchListSection
          title="Live Now"
          matches={liveMatches}
          notifiedIds={scheduledMatchIds}
          setScheduledMatchIds={setScheduledMatchIds}
          onMatchPress={openMatch}
        />
        <MatchListSection
          title="Upcoming"
          matches={upcomingMatches}
          notifiedIds={scheduledMatchIds}
          setScheduledMatchIds={setScheduledMatchIds}
          onMatchPress={openMatch}
        />
        <View className="h-4" />
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 bg-void">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="px-4 pt-2">
          <DashboardHeader onRefresh={refreshData} />
        </View>

        {/* Dynamic content area */}
        {renderContent()}
      </SafeAreaView>
    </View>
  );
}