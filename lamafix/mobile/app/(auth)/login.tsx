import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Dimensions, Text, TextInput, TouchableOpacity, View, useColorScheme, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import { useAuthStore } from '../../store/useAuthStore';

const schema = z.object({
  email: z.string().min(1, 'Email or Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#E5E7EB' : '#1F2937';
  const { height: screenHeight } = Dimensions.get('window');
  const containerHeight = screenHeight / 3;
  const [rememberMe, setRememberMe] = useState(false);
  const loginUser = useAuthStore((state) => state.login);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setIsSubmitting(true);
    try {
      const result = await loginUser(email, password);
      
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F0F8FF] dark:bg-[#0B1929]" edges={['top', 'left', 'right']}>
      <View className="mx-auto flex w-full flex-1 max-w-md">
        <View className="flex-row items-center justify-between px-6 pt-4">
        
        </View>

        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-[32px] bg-white px-8 pt-10 shadow-2xl dark:bg-[#1F2937]"
          style={{
            minHeight: containerHeight,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }}
        >
          <Text className="mb-8 text-center text-3xl font-bold tracking-[0.2em] text-[#4A90E2]">
            UPKEEP
          </Text>

          <View>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View style={{ marginBottom: 20 }}>
                  <Text className="font-semibold text-[#1F2937] dark:text-[#E5E7EB]" style={{ marginBottom: 10 }}>
                    Username
                  </Text>
                  <TextInput
                    className="w-full rounded-xl bg-[#F3F4F6] dark:bg-[#2D3748] border-none py-3 px-4 text-[#1F2937] dark:text-[#E5E7EB]"
                    placeholder="Email or Username"
                    placeholderTextColor={colorScheme === 'dark' ? '#6B7280' : '#9CA3AF'}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.email && (
                    <Text className="mt-1 text-sm text-red-500">{errors.email.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text className="font-semibold text-[#1F2937] dark:text-[#E5E7EB]" style={{ marginBottom: 10 }}>
                    Password
                  </Text>
                  <TextInput
                    className="w-full rounded-xl bg-[#F3F4F6] dark:bg-[#2D3748] border-none py-3 px-4 text-[#1F2937] dark:text-[#E5E7EB]"
                    placeholder="Password"
                    placeholderTextColor={colorScheme === 'dark' ? '#6B7280' : '#9CA3AF'}
                    secureTextEntry
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.password && (
                    <Text className="mt-1 text-sm text-red-500">{errors.password.message}</Text>
                  )}
                </View>
              )}
            />

            <View className="flex-row justify-between items-center py-2">
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  className="h-4 w-4 rounded border border-gray-300 items-center justify-center"
                  style={{
                    backgroundColor: rememberMe ? '#4A90E2' : colorScheme === 'dark' ? '#2D3748' : '#FFFFFF',
                    borderColor: rememberMe ? '#4A90E2' : '#9CA3AF',
                  }}
                >
                  {rememberMe && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
                <Text className="ml-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">Remember Me</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text className="text-sm font-semibold text-[#4A90E2]">Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingTop: 20, paddingBottom: 70 }}>
              <TouchableOpacity
                className="w-full bg-[#4A90E2] py-4 rounded-xl shadow-lg shadow-[#4A90E2]/30"
                disabled={isSubmitting}
                onPress={onSubmit}
              >
                <Text className="text-center text-base font-semibold text-white">Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

