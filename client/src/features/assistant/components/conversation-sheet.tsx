import { BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Check, MessageSquarePlus, Pencil, Trash2, X } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { IconButton, PressableScale, Sheet, Text, type SheetRef } from '@/components/ui';
import { formatDayLabel } from '@/lib/format';
import { useTheme } from '@/theme';

import type { Conversation } from '../types';

interface ConversationSheetProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

function preview(conversation: Conversation): string {
  const last = conversation.messages[conversation.messages.length - 1];
  return last?.content.replace(/\s+/g, ' ').trim() ?? '';
}

export const ConversationSheet = forwardRef<SheetRef, ConversationSheetProps>(
  function ConversationSheet(
    { conversations, activeId, onSelect, onNew, onDelete, onRename },
    ref,
  ) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [draft, setDraft] = useState('');

    const startRename = (conversation: Conversation) => {
      setRenamingId(conversation.id);
      setDraft(conversation.title);
    };

    const commitRename = () => {
      if (renamingId && draft.trim().length > 0) onRename(renamingId, draft);
      setRenamingId(null);
      setDraft('');
    };

    const renderItem = ({ item }: { item: Conversation }) => {
      const isActive = item.id === activeId;
      const title = item.title || t('assistant.newChat');

      if (renamingId === item.id) {
        return (
          <View className="mb-2 flex-row items-center gap-2 rounded-md border border-primary bg-primary-tint px-3 py-2">
            <BottomSheetTextInput
              value={draft}
              onChangeText={setDraft}
              autoFocus
              onSubmitEditing={commitRename}
              placeholder={t('assistant.renamePlaceholder')}
              placeholderTextColor={colors.inkTertiary}
              style={{ flex: 1, color: colors.ink, fontFamily: 'Inter_500Medium', fontSize: 15 }}
            />
            <IconButton
              icon={Check}
              variant="tonal"
              accessibilityLabel={t('common.save')}
              onPress={commitRename}
            />
            <IconButton
              icon={X}
              accessibilityLabel={t('common.cancel')}
              onPress={() => {
                setRenamingId(null);
                setDraft('');
              }}
            />
          </View>
        );
      }

      return (
        <View
          className={`mb-2 flex-row items-center gap-2 rounded-md border px-3 py-2.5 ${
            isActive
              ? 'border-primary bg-primary-tint'
              : 'border-hairline bg-surface dark:bg-surface-elevated'
          }`}
        >
          <PressableScale
            scaleTo={0.98}
            onPress={() => onSelect(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            className="flex-1"
          >
            <Text
              variant="body"
              weight="semibold"
              tone={isActive ? 'accent' : 'primary'}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {preview(item) || formatDayLabel(new Date(item.updatedAt))}
            </Text>
          </PressableScale>
          <IconButton
            icon={Pencil}
            accessibilityLabel={t('assistant.rename')}
            onPress={() => startRename(item)}
          />
          <IconButton
            icon={Trash2}
            accessibilityLabel={t('actions.remove')}
            onPress={() => onDelete(item.id)}
          />
        </View>
      );
    };

    return (
      <Sheet ref={ref} raw snapPoints={['68%']} title={t('assistant.history')}>
        <View className="px-5 pb-2 pt-3">
          <PressableScale
            scaleTo={0.98}
            haptic="tap"
            onPress={onNew}
            accessibilityRole="button"
            className="flex-row items-center justify-center gap-2 rounded-md bg-primary py-3"
          >
            <MessageSquarePlus size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text variant="body" weight="semibold" tone="inverse">
              {t('assistant.newChat')}
            </Text>
          </PressableScale>
        </View>
        <BottomSheetFlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </Sheet>
    );
  },
);
