import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUp, ImagePlus, Square, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { PressableScale } from '@/components/ui';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';

interface ComposerProps {
  busy: boolean;
  onSend: (text: string, images?: string[]) => void;
  onStop: () => void;
}

const MAX_IMAGES = 4;

/** The chat input row: image attachments + auto-growing field + send / stop. */
export function Composer({ busy, onSend, onStop }: ComposerProps) {
  const { colors, gradient } = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const atLimit = images.length >= MAX_IMAGES;
  const canSend = (text.trim().length > 0 || images.length > 0) && !busy;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;
    const attached = images;
    setText('');
    setImages([]);
    onSend(trimmed, attached.length > 0 ? attached : undefined);
  };

  const toDataUri = (asset: ImagePicker.ImagePickerAsset): string | null => {
    if (!asset.base64) return null;
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  };

  const addFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.5,
      base64: true,
    });
    if (result.canceled) return;
    const uris = result.assets.map(toDataUri).filter((u): u is string => u !== null);
    setImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
  };

  const addFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.warning(t('photos.cameraUnavailable'), t('photos.cameraUnavailableMsg'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
    if (result.canceled) return;
    const uri = result.assets?.[0] ? toDataUri(result.assets[0]) : null;
    if (uri) setImages((prev) => [...prev, uri].slice(0, MAX_IMAGES));
  };

  const pickImage = () => {
    if (atLimit) return;
    Alert.alert(t('actions.addPhoto'), undefined, [
      { text: t('photos.takePhoto'), onPress: () => void addFromCamera() },
      { text: t('photos.chooseLibrary'), onPress: () => void addFromLibrary() },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View className="px-3 pb-1 pt-2">
      {images.length > 0 ? (
        <View className="mb-2 flex-row flex-wrap gap-2 pl-1">
          {images.map((uri, index) => (
            <View key={uri} style={{ width: 56, height: 56 }}>
              <Image
                source={{ uri }}
                style={{ width: 56, height: 56, borderRadius: 10 }}
                contentFit="cover"
              />
              <Pressable
                onPress={() => setImages((prev) => prev.filter((u) => u !== uri))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('photos.removePhotoN', { n: index + 1 })}
                className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-ink"
              >
                <X size={11} color={colors.surface} strokeWidth={3} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-end gap-2">
        <PressableScale
          onPress={pickImage}
          disabled={busy || atLimit}
          scaleTo={0.9}
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel={t('actions.addPhoto')}
          accessibilityState={{ disabled: busy || atLimit }}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface-elevated"
        >
          <ImagePlus
            size={20}
            color={busy || atLimit ? colors.inkTertiary : colors.inkSecondary}
            strokeWidth={2}
          />
        </PressableScale>

        <View className="flex-1 justify-center rounded-3xl border border-hairline bg-surface px-4 dark:bg-surface-elevated">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('assistant.inputPlaceholder')}
            placeholderTextColor={colors.inkTertiary}
            multiline
            style={{
              color: colors.ink,
              fontFamily: 'Inter_400Regular',
              fontSize: 16,
              lineHeight: 22,
              paddingTop: 10,
              paddingBottom: 10,
              maxHeight: 132,
            }}
          />
        </View>

        {busy ? (
          <PressableScale
            onPress={onStop}
            scaleTo={0.9}
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel={t('assistant.stop')}
            className="h-11 w-11 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface-elevated"
          >
            <Square size={18} color={colors.ink} strokeWidth={2.5} fill={colors.ink} />
          </PressableScale>
        ) : (
          <PressableScale
            onPress={handleSend}
            disabled={!canSend}
            scaleTo={0.9}
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel={t('assistant.send')}
            accessibilityState={{ disabled: !canSend }}
          >
            {canSend ? (
              <LinearGradient
                colors={[...gradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowUp size={20} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            ) : (
              <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface-elevated">
                <ArrowUp size={20} color={colors.inkTertiary} strokeWidth={2.5} />
              </View>
            )}
          </PressableScale>
        )}
      </View>
    </View>
  );
}
