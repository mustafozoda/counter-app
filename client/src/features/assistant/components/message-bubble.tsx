import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Copy, Pencil, RefreshCw, Sparkles, X, type LucideIcon } from 'lucide-react-native';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { formatTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

import type { ChatMessage } from '../types';
import { FormattedText } from './formatted-text';
import { TypingIndicator } from './typing-indicator';

interface MessageBubbleProps {
  message: ChatMessage;
  /** Copy text to the clipboard (also used by the code blocks' copy button). */
  onCopy: (text: string) => void;
  /** Re-run the last turn — only shown on the latest assistant reply. */
  onRegenerate?: () => void;
  canRegenerate?: boolean;
  /** Edit & resend — only shown on the latest user message. */
  onEdit?: (id: string, text: string) => void;
  canEdit?: boolean;
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
      <Icon size={13} color={active ? colors.positive : colors.inkTertiary} strokeWidth={2.2} />
      <Text variant="micro" weight="medium" tone={active ? 'positive' : 'tertiary'}>
        {label}
      </Text>
    </Pressable>
  );
}

function MessageBubbleBase({
  message,
  onCopy,
  onRegenerate,
  canRegenerate,
  onEdit,
  canEdit,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const { colors, gradient } = useTheme();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const time = formatTime(new Date(message.createdAt));

  const copy = () => {
    if (message.content.length === 0) return;
    onCopy(message.content);
    haptics.selection();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const startEdit = () => {
    setDraft(message.content);
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
  };
  const saveEdit = () => {
    const value = draft.trim();
    if (value.length > 0) onEdit?.(message.id, value);
    setEditing(false);
    setDraft('');
  };

  if (message.role === 'user') {
    if (editing) {
      return (
        <View className="items-end">
          <View className="w-full rounded-2xl border border-primary bg-primary-tint px-3 py-2">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              autoFocus
              multiline
              placeholderTextColor={colors.inkTertiary}
              style={{
                color: colors.ink,
                fontFamily: 'Inter_400Regular',
                fontSize: 16,
                lineHeight: 22,
                maxHeight: 160,
              }}
            />
            <View className="mt-1 flex-row justify-end">
              <ActionChip icon={X} label={t('common.cancel')} onPress={cancelEdit} />
              <ActionChip icon={Check} label={t('common.save')} active onPress={saveEdit} />
            </View>
          </View>
        </View>
      );
    }

    const hasImages = !!message.images && message.images.length > 0;
    const hasText = message.content.length > 0;
    return (
      <Animated.View
        entering={FadeInDown.springify().damping(20).mass(0.5)}
        className="items-end pl-12"
      >
        {hasImages ? (
          <View className="mb-1 flex-row flex-wrap justify-end gap-1.5">
            {message.images!.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{ width: 132, height: 132, borderRadius: 16 }}
                contentFit="cover"
                transition={150}
                accessibilityLabel={t('photos.photoN', { n: i + 1 })}
              />
            ))}
          </View>
        ) : null}

        {hasText ? (
          <Pressable onLongPress={copy} delayLongPress={250}>
            <LinearGradient
              colors={[...gradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 22,
                borderBottomRightRadius: 6,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <Text variant="body" tone="inverse" selectable>
                {message.content}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : null}

        <View className="mt-1 flex-row items-center pr-1">
          <Text variant="micro" tone="tertiary" className="mr-1">
            {time}
          </Text>
          {hasText ? (
            <ActionChip
              icon={copied ? Check : Copy}
              label={copied ? t('assistant.copied') : t('assistant.copy')}
              active={copied}
              onPress={copy}
            />
          ) : null}
          {canEdit && onEdit ? (
            <ActionChip icon={Pencil} label={t('assistant.edit')} onPress={startEdit} />
          ) : null}
        </View>
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
              <FormattedText content={message.content} onCopyCode={onCopy} />
            )}
          </View>
        </Pressable>

        {showActions ? (
          <View className="mt-1 flex-row items-center pl-1">
            <Text variant="micro" tone="tertiary" className="mr-1">
              {time}
            </Text>
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
