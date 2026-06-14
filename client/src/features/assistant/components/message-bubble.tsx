import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

import type { ChatMessage } from '../types';
import { FormattedText } from './formatted-text';
import { TypingIndicator } from './typing-indicator';

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

function MessageBubbleBase({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <View className="items-end pl-12">
        <View className="rounded-3xl rounded-br-lg bg-primary px-4 py-2.5">
          <Text variant="body" tone="inverse">
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row gap-2.5 pr-8">
      <AssistantAvatar />
      <View className="flex-1 rounded-3xl rounded-tl-lg border border-hairline bg-surface px-3.5 py-3 dark:bg-surface-elevated">
        {message.error ? (
          <Text variant="body" tone="negative">
            {message.content}
          </Text>
        ) : message.content.length === 0 ? (
          <TypingIndicator />
        ) : (
          <FormattedText content={message.content} />
        )}
      </View>
    </View>
  );
}

/**
 * Memoized so streaming (which mutates only the last message) doesn't re-render
 * the entire transcript on every token.
 */
export const MessageBubble = memo(MessageBubbleBase);
