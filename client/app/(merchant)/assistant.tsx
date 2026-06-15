import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { ArrowDown, ArrowLeft, History, SquarePen } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, PressableScale, Text, useSheetRef } from '@/components/ui';
import { formatDayLabel } from '@/lib/format';
import { createLocalId } from '@/lib/id';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';

import { Composer } from '@/features/assistant/components/composer';
import { ConversationSheet } from '@/features/assistant/components/conversation-sheet';
import { MessageBubble } from '@/features/assistant/components/message-bubble';
import { streamChat, type ContentPart, type WireMessage } from '@/features/assistant/api';
import { useAssistantStore } from '@/features/assistant/store';
import type { ChatMessage } from '@/features/assistant/types';

/**
 * Convert stored messages into the API wire format: empty turns are dropped,
 * and a user turn carrying images becomes multimodal content parts so a
 * vision-capable model can see them.
 */
function toWire(messages: ChatMessage[]): WireMessage[] {
  const wire: WireMessage[] = [];
  for (const m of messages) {
    const hasImages = m.role === 'user' && !!m.images && m.images.length > 0;
    const hasText = m.content.trim().length > 0;
    if (!hasText && !hasImages) continue;
    if (hasImages) {
      const parts: ContentPart[] = [];
      if (hasText) parts.push({ type: 'text', text: m.content });
      for (const url of m.images!) parts.push({ type: 'image_url', image_url: { url } });
      wire.push({ role: m.role, content: parts });
    } else {
      wire.push({ role: m.role, content: m.content });
    }
  }
  return wire;
}

function AssistantHero({ onPick }: { onPick: (prompt: string) => void }) {
  const { t } = useTranslation();
  const suggestions = [t('assistant.suggest1'), t('assistant.suggest2'), t('assistant.suggest3')];

  return (
    <View className="flex-1 items-center justify-center gap-3 px-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-tint">
        <Text variant="display">✨</Text>
      </View>
      <Text variant="h1" weight="bold" className="text-center">
        {t('assistant.heroTitle')}
      </Text>
      <Text variant="body" tone="secondary" className="text-center">
        {t('assistant.heroSubtitle')}
      </Text>
      <View className="mt-3 w-full gap-2">
        {suggestions.map((s) => (
          <PressableScale
            key={s}
            scaleTo={0.98}
            haptic="tap"
            onPress={() => onPick(s)}
            accessibilityRole="button"
            className="rounded-md border border-hairline bg-surface px-4 py-3 dark:bg-surface-elevated"
          >
            <Text variant="body" tone="secondary">
              {s}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

function DaySeparator({ label }: { label: string }) {
  return (
    <View className="my-1 items-center">
      <View className="rounded-full bg-surface-sunken px-3 py-1 dark:bg-surface-elevated">
        <Text variant="micro" weight="medium" tone="tertiary">
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function AssistantScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const historySheet = useSheetRef();
  const [busy, setBusy] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const conversations = useAssistantStore((s) => s.conversations);
  const activeId = useAssistantStore((s) => s.activeId);
  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  // Only the latest reply can be regenerated; only the latest prompt edited.
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message?.role === 'assistant') return message.id;
    }
    return null;
  }, [messages]);
  const lastUserId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].id;
    }
    return null;
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const showFollowUps =
    !busy &&
    !!lastMessage &&
    lastMessage.role === 'assistant' &&
    lastMessage.content.length > 0 &&
    !lastMessage.error;

  // Keep the latest messages in view when the keyboard opens: the window
  // resizes, so without this the bottom of the chat hides behind the keyboard.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });
    return () => sub.remove();
  }, []);

  // Shared streaming pipeline for first sends, regenerations and edits.
  const streamInto = useCallback(
    (conversationId: string, assistantId: string, history: WireMessage[]) => {
      setBusy(true);
      cancelRef.current = streamChat(history, {
        onDelta: (delta) =>
          useAssistantStore.getState().appendToMessage(conversationId, assistantId, delta),
        onDone: () => {
          setBusy(false);
          cancelRef.current = null;
        },
        onError: () => {
          const current = useAssistantStore
            .getState()
            .conversations.find((c) => c.id === conversationId)
            ?.messages.find((m) => m.id === assistantId);
          useAssistantStore.getState().patchMessage(conversationId, assistantId, {
            content:
              current && current.content.length > 0 ? current.content : t('assistant.errorBody'),
            error: !current || current.content.length === 0,
          });
          setBusy(false);
          cancelRef.current = null;
        },
      });
    },
    [t],
  );

  const send = useCallback(
    (text: string, images?: string[]) => {
      const store = useAssistantStore.getState();
      const conversationId = store.ensureConversation();

      store.addMessage(conversationId, {
        id: createLocalId(),
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
        ...(images && images.length > 0 ? { images } : {}),
      });

      const assistantId = createLocalId();
      store.addMessage(conversationId, {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      });

      const conversation = useAssistantStore
        .getState()
        .conversations.find((c) => c.id === conversationId);
      streamInto(conversationId, assistantId, toWire(conversation?.messages ?? []));
    },
    [streamInto],
  );

  // Re-run the conversation up to the last user turn, replacing the last reply.
  const regenerate = useCallback(() => {
    if (busy) return;
    const store = useAssistantStore.getState();
    const conversationId = store.activeId;
    if (!conversationId) return;
    const conversation = store.conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    let lastIdx = -1;
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      if (conversation.messages[i]?.role === 'assistant') {
        lastIdx = i;
        break;
      }
    }
    const assistantMessage = lastIdx >= 0 ? conversation.messages[lastIdx] : undefined;
    if (!assistantMessage) return;

    const assistantId = conversation.messages[lastIdx].id;
    const history = toWire(conversation.messages.slice(0, lastIdx));
    if (history.length === 0) return;

    store.patchMessage(conversationId, assistantId, { content: '', error: false });
    streamInto(conversationId, assistantId, history);
  }, [busy, streamInto]);

  // Edit a past user message: rewrite it, drop everything after, and re-answer.
  const editAndResend = useCallback(
    (messageId: string, text: string) => {
      if (busy) return;
      const store = useAssistantStore.getState();
      const conversationId = store.activeId;
      if (!conversationId) return;

      store.patchMessage(conversationId, messageId, { content: text });
      store.truncateAfterMessage(conversationId, messageId);

      const assistantId = createLocalId();
      store.addMessage(conversationId, {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      });

      const conversation = useAssistantStore
        .getState()
        .conversations.find((c) => c.id === conversationId);
      streamInto(conversationId, assistantId, toWire(conversation?.messages ?? []));
    },
    [busy, streamInto],
  );

  const copyMessage = useCallback(
    (text: string) => {
      void Clipboard.setStringAsync(text);
      toast.success(t('assistant.copied'));
    },
    [t],
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setShowScrollDown(distanceFromBottom > 160);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  const stop = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setBusy(false);
  };

  const newChat = () => {
    if (busy) stop();
    useAssistantStore.getState().createConversation();
    historySheet.current?.dismiss();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-hairline px-3 pb-2 pt-1">
        <View className="flex-1 flex-row items-center gap-1">
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel={t('actions.back')}
            onPress={() => router.back()}
          />
          <Text variant="title" weight="semibold" numberOfLines={1} className="flex-1">
            {active?.title || t('assistant.title')}
          </Text>
        </View>
        <View className="flex-row items-center">
          <IconButton
            icon={History}
            accessibilityLabel={t('assistant.history')}
            onPress={() => historySheet.current?.present()}
          />
          <IconButton
            icon={SquarePen}
            accessibilityLabel={t('assistant.newChat')}
            onPress={newChat}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <AssistantHero onPick={send} />
        ) : (
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ padding: 16, gap: 14 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((message, index) => {
              const prev = messages[index - 1];
              const showDay =
                !prev ||
                new Date(prev.createdAt).toDateString() !==
                  new Date(message.createdAt).toDateString();
              return (
                <View key={message.id} className="gap-3.5">
                  {showDay ? (
                    <DaySeparator label={formatDayLabel(new Date(message.createdAt))} />
                  ) : null}
                  <MessageBubble
                    message={message}
                    onCopy={copyMessage}
                    onRegenerate={regenerate}
                    canRegenerate={message.id === lastAssistantId && !busy}
                    onEdit={editAndResend}
                    canEdit={message.id === lastUserId && !busy}
                  />
                </View>
              );
            })}

            {showFollowUps ? (
              <View className="flex-row flex-wrap gap-2 pl-10">
                {[t('assistant.followUp1'), t('assistant.followUp2'), t('assistant.followUp3')].map(
                  (f) => (
                    <PressableScale
                      key={f}
                      scaleTo={0.97}
                      haptic="tap"
                      onPress={() => send(f)}
                      accessibilityRole="button"
                      className="rounded-full border border-hairline bg-surface px-3 py-1.5 dark:bg-surface-elevated"
                    >
                      <Text variant="caption" tone="secondary">
                        {f}
                      </Text>
                    </PressableScale>
                  ),
                )}
              </View>
            ) : null}
          </ScrollView>
        )}

        {showScrollDown && messages.length > 0 ? (
          <Animated.View entering={FadeIn.duration(150)} className="absolute bottom-20 right-4">
            <PressableScale
              onPress={scrollToBottom}
              scaleTo={0.9}
              haptic="tap"
              accessibilityRole="button"
              accessibilityLabel={t('assistant.scrollDown')}
              className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface dark:bg-surface-elevated"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              }}
            >
              <ArrowDown size={18} color={colors.ink} strokeWidth={2.5} />
            </PressableScale>
          </Animated.View>
        ) : null}

        <View
          className="bg-background"
          style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 4 }}
        >
          <Composer busy={busy} onSend={send} onStop={stop} />
        </View>
      </KeyboardAvoidingView>

      <ConversationSheet
        ref={historySheet}
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          useAssistantStore.getState().setActive(id);
          historySheet.current?.dismiss();
        }}
        onNew={newChat}
        onDelete={(id) => useAssistantStore.getState().deleteConversation(id)}
        onRename={(id, title) => useAssistantStore.getState().renameConversation(id, title)}
      />
    </SafeAreaView>
  );
}
