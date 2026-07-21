import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';

interface ChannelTrayProps {
  servers: any[];
  activeServerIndex: number;
  onServerChange: (index: number) => void;
}

export function ChannelSelector({ servers, activeServerIndex, onServerChange }: ChannelTrayProps) {
  return (
    <View className="bg-[#0B0C10] px-4 py-3 w-full">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          gap: 10,
          paddingRight: 16,
          alignItems: 'center'
        }}
      >
        {servers.map((server, index) => {
          const active = index === activeServerIndex;
          return (
            <TouchableOpacity
              key={index}
              className={`rounded-full border px-6 py-3.5 ${active
                ? 'border-neon/50 bg-neon/15'
                : 'border-border bg-surface active:bg-surface-elevated'
                }`}
              onPress={() => onServerChange(index)}
              disabled={active}
            >
              <Text className={`text-md font-semibold ${active ? 'text-neon' : 'text-muted'}`}>
                {server.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}