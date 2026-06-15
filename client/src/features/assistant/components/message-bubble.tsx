import { LinearGradient } from 'expo-linear-gradient';
import { Check, Copy, RefreshCw, Sparkles, type LucideIcon } from 'lucide-react-native';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

import type { ChatMessage } from '../types';
import { FormattedText } from './formatted-text';
import { TypingIndicator } from './typing-indicator';

interface MessageBubbleProps {
  message: ChatMessage;
  /** Copy the message text to the clipboard. */
  onCopy: (text: string) => void;
  /** Re-run the last turn. Passed for every bubble; only shown on the last one. */
  onRegenerate?: () => void;
  /** True only for the latest assistant reply while idle. */
  canRegenerate?: boolean;
}

function AssistantAvatar() {
  const { gradient } = useTheme();
  return (
    <LinearGradient
      colors={[...gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Sparkles size={15} color="#FFFFFF" strokeWidth={2} />
    </LinearGradient>
  );
}

function ActionChip({
  icon: Icon,
  label,
  active = false,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center gap-1 rounded-full px-2 py-1 active:opacity-50"
    >
      <Icon
        size={13}
        color={active ? colors.positive : colors.inkTertiary}
        strokeWidth={2.2}
      />
      <Text variant="micro" weight="medium" tone={active ? 'positive' : 'tertiary'}>
        {label}
      </Text>
    </Pressable>
  );
}

function MessageBubbleBase({ message, onCopy, onRegenerate, canRegenerate }: MessageBubbleProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (message.content.length === 0) return;
    onCopy(message.content);
    haptics.selection();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (message.role === 'user') {
    return (
      <Animated.View entering={FadeInDown.springify().damping(20).mass(0.5)} className="items-end pl-12">
        <Pressable onLongPress={copy} delayLongPress={250}>
          <View className="rounded-3xl rounded-br-lg bg-primary px-4 py-2.5">
            <Text variant="body" tone="inverse" selectable>
              {message.content}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  const empty = message.content.length === 0;
  const showActions = !empty && !message.error;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).mass(0.5)}
      className="flex-row gap-2.5 pr-8"
    >
      <AssistantAvatar />
      <View className="flex-1">
        <Pressable onLongPress={empty ? undefined : copy} delayLongPress={250}>
          <View className="rounded-3xl rounded-tl-lg border border-hairline bg-surface px-3.5 py-3 dark:bg-surface-elevated">
            {message.error ? (
              <Text variant="body" tone="negative">
                {message.content}
              </Text>
            ) : empty ? (
              <TypingIndicator />
            ) : (
              <FormattedText content={message.content} />
            )}
          </View>
        </Pressable>

        {showActions ? (
          <View className="mt-1 flex-row items-center pl-1">
            <ActionChip
              icon={copied ? Check : Copy}
              label={copied ? t('assistant.copied') : t('assistant.copy')}
              active={copied}
              onPress={copy}
            />
            {canRegenerate && onRegenerate ? (
              <ActionChip icon={RefreshCw} label={t('assistant.regenerate')} onPress={onRegenerate} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/**
 * Memoized so streaming (which mutates only the last message) doesn't re-render
 * the entire transcript on every token.
 */
export const MessageBubble = memo(MessageBubbleBase);
