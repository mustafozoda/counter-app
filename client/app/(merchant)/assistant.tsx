import { useRouter } from 'expo-router';
import { ArrowLeft, History, SquarePen } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, PressableScale, Text, useSheetRef } from '@/components/ui';
import { createLocalId } from '@/lib/id';

import { Composer } from '@/features/assistant/components/composer';
import { ConversationSheet } from '@/features/assistant/components/conversation-sheet';
import { MessageBubble } from '@/features/assistant/components/message-bubble';
import { streamChat } from '@/features/assistant/api';
import { useAssistantStore } from '@/features/assistant/store';

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

export default function AssistantScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const historySheet = useSheetRef();
  const [busy, setBusy] = useState(false);

  const conversations = useAssistantStore((s) => s.conversations);
  const activeId = useAssistantStore((s) => s.activeId);
  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  // Keep the latest messages in view when the keyboard opens: the window
  // resizes, so without this the bottom of the chat hides behind the keyboard.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });
    return () => sub.remove();
  }, []);

  const send = (text: string) => {
    const store = useAssistantStore.getState();
    const conversationId = store.ensureConversation();

    store.addMessage(conversationId, {
      id: createLocalId(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
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
    const history = (conversation?.messages ?? [])
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

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
  };

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
        keyboardVerticalOffset={0} // insets.top + 44
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
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </ScrollView>
        )}

        <View
          className="bg-background"
          style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 4 }}
          // style={{ paddingBottom: 0 }}
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
