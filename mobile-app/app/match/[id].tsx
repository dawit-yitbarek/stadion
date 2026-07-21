import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, BackHandler, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoRef } from 'react-native-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useMatches } from '@/context/MatchesContext';
import { MaterialIcons } from '@expo/vector-icons';

import VideoPlayer from '@/components/stream/VideoPlayer';
import { ChannelSelector } from '@/components/stream/ChannelSelector';
import { MatchListSection } from '@/components/dashboard/MatchListSection';

export default function LiveMatchStreamScreen() {
  const router = useRouter();
  const isNavigating = useRef(false);
  const { id } = useLocalSearchParams();
  const { matches, scheduledMatchIds, setScheduledMatchIds, getLiveMatches, getUpcomingMatches } = useMatches();

  // Guard clause: match not found
  const match = matches.find(m => m.id === id);
  if (!match) {
    return (
      <View className='flex-1 bg-void justify-center items-center gap-8 p-4'>
        <Text className="text-muted text-lg text-center">Match not found. It may have ended.</Text>
        <TouchableOpacity
          className="bg-surface py-2.5 px-5 rounded border border-cyan"
          onPress={() => router.replace('/')}
        >
          <Text className="text-cyan font-bold text-sm">Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sortedMatches = [...getLiveMatches('All'), ...getUpcomingMatches('All')].filter(m => m.id !== id);

  // Guard clause: no servers available
  if (!match.servers || match.servers.length === 0) {
    const isUpcoming = match.match_status === 'vs';

    return (
      <View className='flex-1 bg-void justify-center items-center gap-6 p-6'>
        {isUpcoming ? (
          <>
            <MaterialIcons
              name='hourglass-top'
              size={32}
              className='text-cyan'
            />
            <Text className="text-white text-xl font-bold text-center mt-2">
              Streaming Channels Loading
            </Text>
            <Text className="text-muted text-sm text-center px-4 leading-5">
              Channels for this match are usually updated 30-60 minutes before kickoff.
              Please check back closer to the start time!
            </Text>
          </>
        ) : (
          <>
            <MaterialIcons
              name='warning'
              size={32}
              className='text-red-500'
            />
            <Text className="text-white text-xl font-bold text-center mt-2">
              Stream Temporarily unavailable
            </Text>
            <Text className="text-muted text-sm text-center px-4 leading-5">
              We couldn't find broadcasting channel for this match.
              Our system is constantly checking for alternatives.
            </Text>
          </>
        )}

        <TouchableOpacity
          className="bg-surface mt-4 py-3 px-6 rounded-lg border border-cyan active:opacity-70"
          onPress={() => router.replace('/')}
        >
          <Text className="text-cyan font-bold text-sm">Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const servers = match.servers.map((server, index) => ({
    ...server,
    name: `Channel ${index + 1}`
  }));

  const videoRef = useRef<VideoRef>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeServerIndex, setActiveServerIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isDead, setIsDead] = useState<boolean>(false);
  const [deadReason, setDeadReason] = useState<string>('');

  const startControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  const handleScreenTap = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (showControls) {
      setShowControls(false);
    } else {
      setShowControls(true);
      startControlsTimeout();
    }
  };

  const toggleFullscreenMode = async () => {
    if (showControls) startControlsTimeout();

    if (!isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
    }
  };

  const handleServerChange = (index: number) => {
    setActiveServerIndex(index);
    setIsLoading(true);
    setIsBuffering(false);
    setIsDead(false);
    setDeadReason('');
    setShowControls(true);
    startControlsTimeout();
  };

  const openMatch = useCallback((matchId: string) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.push({ pathname: '/match/[id]', params: { id: matchId } });
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  }, [router])

  useEffect(() => {
    if (servers && servers.length > 0) {
      startControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [servers]);

  useEffect(() => {
    const backAction = () => {
      if (isFullscreen) {
        toggleFullscreenMode();
        return true;
      } else {
        router.replace('/');
        return true;
      }
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isFullscreen]);

  const activeServer = servers[activeServerIndex];

  return (
    <View className="flex-1 bg-black">
      <VideoPlayer
        videoRef={videoRef}
        activeServer={activeServer}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        isFullscreen={isFullscreen}
        toggleFullscreenMode={toggleFullscreenMode}
        showControls={showControls}
        setShowControls={setShowControls}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        isBuffering={isBuffering}
        setIsBuffering={setIsBuffering}
        isDead={isDead}
        setIsDead={setIsDead}
        deadReason={deadReason}
        setDeadReason={setDeadReason}
        handleScreenTap={handleScreenTap}
        startControlsTimeout={startControlsTimeout}
        onRetry={() => handleServerChange(activeServerIndex)}
      />

      {!isFullscreen && (
        <ChannelSelector
          servers={servers}
          activeServerIndex={activeServerIndex}
          onServerChange={handleServerChange}
        />
      )}

      <ScrollView contentContainerClassName="px-6 py-6">
        <MatchListSection
          matches={sortedMatches}
          notifiedIds={scheduledMatchIds}
          onMatchPress={openMatch}
          setScheduledMatchIds={setScheduledMatchIds}
        />
      </ScrollView>
    </View>
  );
}