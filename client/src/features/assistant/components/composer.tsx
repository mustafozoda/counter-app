import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUp, Square } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import { PressableScale } from '@/components/ui';
import { useTheme } from '@/theme';

interface ComposerProps {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

/** The chat input row: auto-growing field + gradient send / stop button. */
export function Composer({ busy, onSend, onStop }: ComposerProps) {
  const { colors, gradient } = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const canSend = text.trim().length > 0 && !busy;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    onSend(trimmed);
  };

  return (
    <View className="flex-row items-end gap-2 px-3 pb-1 pt-2">
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
  );
}
