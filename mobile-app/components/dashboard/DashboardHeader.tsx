import { FontAwesome } from '@expo/vector-icons';
import { Text, View, TouchableOpacity } from 'react-native';
import { Image } from 'react-native';
import { ExternalLink } from '../ExternalLink';
import appLogo from '@/assets/images/433-logo.png';

interface DashboardHeaderProps {
  onRefresh?: () => void;
}

export function DashboardHeader({ onRefresh }: DashboardHeaderProps) {
  return (
    <View className="mb-5 px-4 flex-row items-center justify-between">
      <View className="flex-row items-center gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-full border border-cyan/30 bg-surface-elevated">
          <Image
            source={appLogo}
            className={`h-full w-full rounded-full`}
          />
        </View>
        <View>
          <Text className="text-xl font-bold tracking-tight text-white">4-3-3 Sport</Text>
          <Text className="text-xs text-muted">Ethiopia</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-4">
        <TouchableOpacity
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <View className="relative h-10 w-10 items-center justify-center rounded-full bg-surface-elevated">
            <FontAwesome name="refresh" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <ExternalLink
          href='https://t.me/Sport_433et'
        >
          <View className="relative h-10 w-10 items-center justify-center rounded-full bg-surface-elevated">
            <FontAwesome name="paper-plane" size={20} color="#FFFFFF" />
          </View>
        </ExternalLink>
      </View>
    </View>
  );
}
