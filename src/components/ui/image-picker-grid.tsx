import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

export interface ImagePickerGridProps {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
}

const TILE = 96;

/** Product photo grid: camera or library, tap × to remove. First image is the cover. */
export function ImagePickerGrid({ images, onChange, max = 6 }: ImagePickerGridProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const addFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: max - images.length,
      quality: 0.8,
    });
    if (result.canceled) return;
    const uris = result.assets.map((a) => a.uri);
    onChange([...images, ...uris].slice(0, max));
  };

  const addFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.warning(t('photos.cameraUnavailable'), t('photos.cameraUnavailableMsg'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    const uri = result.assets?.[0]?.uri;
    if (!result.canceled && uri) onChange([...images, uri].slice(0, max));
  };

  const pick = () => {
    haptics.tap();
    Alert.alert(t('actions.addPhoto'), undefined, [
      { text: t('photos.takePhoto'), onPress: () => void addFromCamera() },
      { text: t('photos.chooseLibrary'), onPress: () => void addFromLibrary() },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View className="flex-row flex-wrap gap-3">
      {images.map((uri, index) => (
        <View key={uri} style={{ width: TILE, height: TILE }}>
          <Image
            source={{ uri }}
            style={{ width: TILE, height: TILE, borderRadius: 16 }}
            contentFit="cover"
            transition={150}
            accessibilityLabel={index === 0 ? t('photos.coverPhoto') : t('photos.photoN', { n: index + 1 })}
          />
          {index === 0 ? (
            <View className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/70 px-2 py-0.5">
              <Text variant="micro" weight="semibold" tone="inverse">
                {t('photos.cover')}
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => onChange(images.filter((u) => u !== uri))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('photos.removePhotoN', { n: index + 1 })}
            className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-ink"
          >
            <X size={12} color={colors.surface} strokeWidth={3} />
          </Pressable>
        </View>
      ))}
      {images.length < max ? (
        <PressableScale
          onPress={pick}
          accessibilityRole="button"
          accessibilityLabel={t('actions.addPhoto')}
          className="items-center justify-center gap-1 rounded-md border border-dashed border-ink-tertiary/50 bg-surface-sunken dark:bg-surface"
          style={{ width: TILE, height: TILE }}
        >
          {images.length === 0 ? (
            <Camera size={22} color={colors.inkTertiary} strokeWidth={1.75} />
          ) : (
            <ImagePlus size={22} color={colors.inkTertiary} strokeWidth={1.75} />
          )}
          <Text variant="micro" weight="medium" tone="tertiary">
            {images.length === 0 ? t('photos.addPhotos') : t('photos.addMore')}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}
