import { useRouter } from 'expo-router';
import { Image, Text, TouchableOpacity, View, useColorScheme, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const illustration = require('../assets/background (1).png');

export default function GetStartedScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#E5E7EB' : '#1F2937';
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const containerHeight = screenHeight / 3;
  const imageAspectRatio = 1000 / 900;
  const imageWidth = Math.min(2800, screenWidth);
  const imageHeight = imageWidth / imageAspectRatio;
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F0F8FF] dark:bg-[#0B1929]" edges={['top', 'left', 'right']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F0F8FF] dark:bg-[#0B1929]" edges={['top', 'left', 'right']}>
      <View className="mx-auto flex w-full flex-1 max-w-md">
        <View className="flex-row items-center justify-between px-6 pt-4">
          
        </View>

        <Image
          source={illustration}
          accessibilityRole="image"
          style={{
            position: 'absolute',
            width: imageWidth,
            height: imageHeight,
            bottom: containerHeight + 100,
            left: (screenWidth - imageWidth) / 2,
          }}
          resizeMode="contain"
        />

        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-[32px] bg-white px-8 pt-10 shadow-2xl dark:bg-[#1F2937]"
          style={{ 
            minHeight: containerHeight
          }}
        >
          <Text className="mb-4 text-center text-3xl font-bold tracking-[0.2em] text-[#4A90E2]">
            UPKEEP
          </Text>
          <Text className="mb-3 text-center text-2xl font-bold leading-tight text-[#1F2937] dark:text-[#E5E7EB]">
            Let's Get You Set Up{'\n'}for Success
          </Text>
          <Text className="mb-10 text-center text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Organize your workflow and manage tasks easily all in one simple, powerful app.
          </Text>
          <View style={{ paddingTop: 20, paddingBottom: 70 }}>
            <TouchableOpacity
              className="rounded-full bg-[#4A90E2] py-4 shadow-lg shadow-[#4A90E2]/30"
              onPress={() => router.push('/(auth)/login')}
              accessibilityRole="button"
            >
              <Text className="text-center text-base font-semibold text-white">Get started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

