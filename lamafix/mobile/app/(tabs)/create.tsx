import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import { useWorkStore } from '../../store/useWorkStore';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

const schema = z.object({
  requesterName: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
  title: z.string().min(3, 'Add a descriptive title'),
  asset: z.string().min(1, 'Pick an asset'),
  partsRequired: z.enum(['yes', 'no']),
  partsDescription: z.string().optional(),
  numberOfParts: z.string().optional(),
  problem: z.string().min(6, 'Tell us about the problem'),
  assistance: z.string().min(6, 'Let us know how we can help'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
}).refine(
  (data) => {
    if (data.partsRequired === 'yes') {
      return data.partsDescription && data.partsDescription.length >= 3;
    }
    return true;
  },
  {
    message: 'Please describe what parts are required',
    path: ['partsDescription'],
  }
).refine(
  (data) => {
    if (data.partsRequired === 'yes') {
      return data.numberOfParts && data.numberOfParts.length >= 1;
    }
    return true;
  },
  {
    message: 'Please specify the number of parts',
    path: ['numberOfParts'],
  }
);

type CreateRequestValues = z.infer<typeof schema>;

const PRIORITY_OPTIONS: CreateRequestValues['priority'][] = ['low', 'medium', 'high', 'urgent'];

export default function CreateOrderScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const addOrder = useWorkStore((state) => state.addOrder);
  const assets = useWorkStore((state) => state.assets);
  const fetchAssets = useWorkStore((state) => state.fetchAssets);
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Fetch assets on mount
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateRequestValues>({
    defaultValues: {
      requesterName: '',
      location: '',
      title: '',
      asset: '',
      partsRequired: 'no',
      partsDescription: '',
      numberOfParts: '',
      problem: '',
      assistance: '',
      priority: 'medium',
    },
    resolver: zodResolver(schema),
  });

  const selectedPartsRequired = watch('partsRequired');
  const selectedPriority = watch('priority');
  const selectedAsset = watch('asset');
  const placeholderColor = colorScheme === 'dark' ? '#6B7280' : '#9CA3AF';

  const pickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your media library to upload images/videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map(asset => asset.uri);
        setUploadedMedia(prev => [...prev, ...newUris]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    }
  };

  const removeMedia = (uri: string) => {
    setUploadedMedia(prev => prev.filter(item => item !== uri));
  };

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmittingForm(true);
    
    try {
      // Find selected asset
      const selectedAsset = assets.find(a => a.id === values.asset || a.name === values.asset);
      
      if (!selectedAsset) {
        Alert.alert('Error', 'Please select a valid asset');
        setIsSubmittingForm(false);
        return;
      }

      // Upload images first
      const uploadedUrls: string[] = [];
      if (uploadedMedia.length > 0) {
        setIsUploading(true);
        try {
          for (const uri of uploadedMedia) {
            const uploadResult = await apiService.uploadFile(uri, 'workorder');
            if (uploadResult.success && uploadResult.data) {
              uploadedUrls.push(uploadResult.data.url);
            }
          }
        } catch (error) {
          console.error('Upload error:', error);
          Alert.alert('Warning', 'Some images failed to upload, but work order will still be created.');
        } finally {
          setIsUploading(false);
        }
      }

      // Build summary with parts info
      const partsSummary = values.partsRequired === 'yes' 
        ? `\n\nParts required: Yes\nParts description: ${values.partsDescription}\nNumber of parts: ${values.numberOfParts}`
        : `\n\nParts required: No`;
      
      const summary = `${values.problem}\n\nRequested help: ${values.assistance}${partsSummary}`;

      // Map priority
      let priority: 'Low' | 'Medium' | 'High' = 'Medium';
      if (values.priority === 'urgent' || values.priority === 'high') {
        priority = 'High';
      } else if (values.priority === 'low') {
        priority = 'Low';
      }

      // Create work order
      const result = await addOrder({
        title: values.title,
        site: `${values.location} • ${selectedAsset.name}`,
        priority,
        scheduledFor: new Date().toISOString(),
        summary,
        assetId: selectedAsset.id,
        location: values.location,
      });

      if (result.success) {
        reset();
        setUploadedMedia([]);
        router.push('/(tabs)');
        Alert.alert('Success', 'Work order created successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to create work order');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmittingForm(false);
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-[#f6f7f8] dark:bg-[#111921]" edges={['top', 'left', 'right']}>
      <View className="flex-1">
        <Header colorScheme={colorScheme} onBack={() => router.back()} />

        <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 120 }}>
          <View className="flex-row flex-wrap gap-4">
            <Controller
              control={control}
              name="requesterName"
              render={({ field }) => (
                <InputField
                  label="Name"
                  placeholder="Your Name"
                  placeholderColor={placeholderColor}
                  containerClassName="flex-1 min-w-[150px]"
                  error={errors.requesterName?.message}
                  {...field}
                />
              )}
            />
            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <InputField
                  label="Location"
                  placeholder="e.g., Floor 2"
                  placeholderColor={placeholderColor}
                  containerClassName="flex-1 min-w-[150px]"
                  error={errors.location?.message}
                  {...field}
                />
              )}
            />
          </View>

          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <InputField
                label="Title of the Request"
                placeholder="e.g., Conveyor belt is making noise"
                placeholderColor={placeholderColor}
                containerClassName="mt-6"
                error={errors.title?.message}
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="asset"
            render={({ field: { onChange } }) => (
              <OptionsField
                label="Assets"
                options={assets.map(a => ({ value: a.id, label: a.name }))}
                placeholder="Select an asset"
                value={selectedAsset}
                onChange={onChange}
                error={errors.asset?.message}
              />
            )}
          />

          <View className="mt-6">
            <Text className="pb-2 text-base font-semibold text-gray-800 dark:text-gray-200">Parts Required?</Text>
            <View className="flex-row gap-3">
              {(['yes', 'no'] as const).map((option) => {
                const isActive = selectedPartsRequired === option;
                return (
                  <Pressable
                    key={option}
                    className={`flex-1 h-12 items-center justify-center rounded-lg border ${
                      isActive
                        ? 'border-[#197fe6] bg-[#197fe6]/10'
                        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                    onPress={() => setValue('partsRequired', option)}
                  >
                    <Text
                      className={`text-base font-medium ${
                        isActive ? 'text-[#197fe6]' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option === 'yes' ? 'Yes' : 'No'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.partsRequired && (
              <Text className="mt-1 text-sm text-red-500">{errors.partsRequired.message}</Text>
            )}
          </View>

          {selectedPartsRequired === 'yes' && (
            <>
              <Controller
                control={control}
                name="partsDescription"
                render={({ field }) => (
                  <TextareaField
                    label="What parts are required?"
                    placeholder="e.g., Conveyor Belt #01 needs new roller bearings..."
                    placeholderColor={placeholderColor}
                    error={errors.partsDescription?.message}
                    {...field}
                  />
                )}
              />

              <Controller
                control={control}
                name="numberOfParts"
                render={({ field }) => (
                  <InputField
                    label="Number of parts required"
                    placeholder="e.g., 4"
                    placeholderColor={placeholderColor}
                    containerClassName="mt-6"
                    error={errors.numberOfParts?.message}
                    {...field}
                  />
                )}
              />
            </>
          )}

          <Controller
            control={control}
            name="problem"
            render={({ field }) => (
              <TextareaField
                label="Where or what is the problem?"
                placeholder="e.g., A strange rattling sound from the main motor..."
                placeholderColor={placeholderColor}
                error={errors.problem?.message}
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="assistance"
            render={({ field }) => (
              <TextareaField
                label="How can we help?"
                placeholder="e.g., Please send a technician to inspect."
                placeholderColor={placeholderColor}
                error={errors.assistance?.message}
                {...field}
              />
            )}
          />

          <UploadField 
            colorScheme={colorScheme} 
            onPress={pickMedia}
            uploadedMedia={uploadedMedia}
            onRemove={removeMedia}
          />

          <View className="mt-6">
            <Text className="pb-2 text-base font-semibold text-gray-800 dark:text-gray-200">Priority</Text>
            <View className="flex-row flex-wrap gap-3">
              {PRIORITY_OPTIONS.map((option) => {
                const isActive = selectedPriority === option;
                return (
                  <Pressable
                    key={option}
                    className={`flex-1 min-w-[140px] rounded-lg border px-4 py-3 ${
                      isActive
                        ? 'border-[#197fe6] bg-[#197fe6]/10'
                        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                    onPress={() => setValue('priority', option)}
                  >
                    <Text
                      className={`text-center text-base font-medium ${
                        isActive ? 'text-[#197fe6]' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.priority && (
              <Text className="mt-1 text-sm text-red-500">{errors.priority.message}</Text>
            )}
          </View>
        </ScrollView>

        <View className="border-t border-gray-200/80 dark:border-gray-700/80 bg-[#f6f7f8] dark:bg-[#111921] px-4 pb-12">
          <Pressable
            className={`rounded-xl bg-[#197fe6] py-4 ${isSubmittingForm || isUploading ? 'opacity-70' : ''}`}
            disabled={isSubmittingForm || isUploading}
            onPress={onSubmit}
          >
            {isSubmittingForm || isUploading ? (
              <View className="flex-row items-center justify-center gap-2">
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-center text-base font-bold text-white">
                  {isUploading ? 'Uploading...' : 'Submitting...'}
                </Text>
              </View>
            ) : (
              <Text className="text-center text-base font-bold text-white">Submit Request</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const Header = ({ colorScheme, onBack }: { colorScheme: 'light' | 'dark' | null | undefined; onBack: () => void }) => (
  <View className="flex-row items-center justify-between border-b border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-[#111921]/80 px-4 py-4">
    <Pressable className="h-10 w-10 items-center justify-center" onPress={onBack}>
      <Ionicons name="arrow-back" size={22} color={colorScheme === 'dark' ? '#E5E7EB' : '#1F2937'} />
    </Pressable>
    <Text className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-gray-100">Create New Request</Text>
    <Pressable onPress={onBack}>
      <Text className="text-sm font-semibold text-[#197fe6]">Cancel</Text>
    </Pressable>
  </View>
);

type InputFieldProps = {
  label: string;
  placeholder: string;
  placeholderColor: string;
  containerClassName?: string;
  error?: string;
  value: string | undefined;
  onChange: (val: string) => void;
};

const InputField = ({
  label,
  placeholder,
  placeholderColor,
  containerClassName,
  error,
  value,
  onChange,
}: InputFieldProps) => (
  <View className={containerClassName}>
    <Text className="pb-2 text-base font-semibold text-gray-800 dark:text-gray-200">{label}</Text>
    <TextInput
      className="h-14 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-base text-gray-900 dark:text-gray-100"
      placeholder={placeholder}
      placeholderTextColor={placeholderColor}
      value={value}
      onChangeText={onChange}
    />
    {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
  </View>
);

type TextareaFieldProps = {
  label: string;
  placeholder: string;
  placeholderColor: string;
  error?: string;
  value: string | undefined;
  onChange: (val: string) => void;
};

const TextareaField = ({ label, placeholder, placeholderColor, error, value, onChange }: TextareaFieldProps) => (
  <View className="mt-6">
    <Text className="pb-2 text-base font-semibold text-gray-800 dark:text-gray-200">{label}</Text>
    <TextInput
      className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-base text-gray-900 dark:text-gray-100"
      placeholder={placeholder}
      placeholderTextColor={placeholderColor}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
      value={value}
      onChangeText={onChange}
    />
    {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
  </View>
);

type OptionsFieldProps = {
  label: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  error?: string;
};

const OptionsField = ({ label, placeholder, options, value, onChange, error }: OptionsFieldProps) => (
  <View className="mt-6">
    <Text className="pb-2 text-base font-semibold text-gray-800 dark:text-gray-200">{label}</Text>
    <View className="flex-row flex-wrap gap-3">
      <Pressable
        className={`flex-1 min-w-[140px] rounded-lg border px-4 py-3 ${
          value ? 'border-gray-300 dark:border-gray-700' : 'border-[#197fe6] bg-[#197fe6]/5'
        }`}
        onPress={() => onChange('')}
      >
        <Text className={`text-center text-base ${value ? 'text-gray-500 dark:text-gray-400' : 'text-[#197fe6]'}`}>
          {placeholder}
        </Text>
      </Pressable>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <Pressable
            key={option.value}
            className={`flex-1 min-w-[140px] rounded-lg border px-4 py-3 ${
              isActive ? 'border-[#197fe6] bg-[#197fe6]/10' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
            onPress={() => onChange(option.value)}
          >
            <Text
              className={`text-center text-base font-medium ${
                isActive ? 'text-[#197fe6]' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
    {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
  </View>
);

const UploadField = ({ 
  colorScheme, 
  onPress,
  uploadedMedia,
  onRemove 
}: { 
  colorScheme: 'light' | 'dark' | null | undefined;
  onPress: () => void;
  uploadedMedia: string[];
  onRemove: (uri: string) => void;
}) => (
  <View className="mt-6">
    <Text className="pb-2 text-base font-semibold text-gray-800 dark:text-gray-200">Upload Image / Video</Text>
    <Pressable 
      className="h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
      onPress={onPress}
    >
      <Ionicons name="cloud-upload-outline" size={32} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
      <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        <Text className="font-semibold">Tap to upload</Text> or drag and drop
      </Text>
      <Text className="text-xs text-gray-500 dark:text-gray-400">SVG, PNG, JPG or MP4</Text>
    </Pressable>
    
    {uploadedMedia.length > 0 && (
      <View className="mt-3 flex-row flex-wrap gap-2">
        {uploadedMedia.map((uri, index) => (
          <View key={uri} className="relative">
            <Image 
              source={{ uri }} 
              className="h-20 w-20 rounded-lg"
              resizeMode="cover"
            />
            <Pressable
              className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-red-500"
              onPress={() => onRemove(uri)}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </Pressable>
            <View className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5">
              <Text className="text-xs text-white">{index + 1}</Text>
            </View>
          </View>
        ))}
      </View>
    )}
  </View>
);

