import { type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { Text } from '@/components/ui';

/**
 * Lightweight Markdown renderer tuned for chat replies: fenced code blocks,
 * inline `code`, **bold**, and `-`/`*`/numbered bullet lines. Not a full
 * Markdown engine — just enough to make model output read nicely without
 * pulling in a heavy dependency.
 */

interface Segment {
  type: 'text' | 'code';
  value: string;
}

const FENCE = /```[a-zA-Z0-9]*\n?([\s\S]*?)```/g;

function splitFences(input: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  FENCE.lastIndex = 0;
  while ((match = FENCE.exec(input))) {
    if (match.index > last) segments.push({ type: 'text', value: input.slice(last, match.index) });
    segments.push({ type: 'code', value: (match[1] ?? '').replace(/\n$/, '') });
    last = FENCE.lastIndex;
  }
  if (last < input.length) segments.push({ type: 'text', value: input.slice(last) });
  return segments;
}

const INLINE = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[2] !== undefined) {
      nodes.push(
        <Text key={key++} weight="bold">
          {match[2]}
        </Text>,
      );
    } else if (match[3] !== undefined) {
      nodes.push(
        <Text key={key++} mono tone="accent">
          {match[3]}
        </Text>,
      );
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function CodeBlock({ code }: { code: string }) {
  return (
    <View className="rounded-md border border-hairline bg-surface-sunken px-3 py-2.5 dark:bg-surface">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text mono variant="caption" tone="secondary" selectable>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

function TextBlock({ value }: { value: string }) {
  const lines = value.replace(/\n{3,}/g, '\n\n').split('\n');
  return (
    <View className="gap-1.5">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return <View key={index} className="h-1" />;

        const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
        if (bullet) {
          return (
            <View key={index} className="flex-row gap-2 pl-1">
              <Text variant="body" tone="secondary">
                {'•'}
              </Text>
              <Text variant="body" className="flex-1">
                {renderInline(bullet[1] ?? '')}
              </Text>
            </View>
          );
        }

        const numbered = /^(\d+)\.\s+(.*)$/.exec(trimmed);
        if (numbered) {
          return (
            <View key={index} className="flex-row gap-2 pl-1">
              <Text variant="body" tone="secondary" tabular>
                {numbered[1]}.
              </Text>
              <Text variant="body" className="flex-1">
                {renderInline(numbered[2] ?? '')}
              </Text>
            </View>
          );
        }

        return (
          <Text key={index} variant="body" selectable>
            {renderInline(line)}
          </Text>
        );
      })}
    </View>
  );
}

export function FormattedText({ content }: { content: string }) {
  const segments = splitFences(content);
  return (
    <View className="gap-2.5">
      {segments.map((segment, index) =>
        segment.type === 'code' ? (
          <CodeBlock key={index} code={segment.value} />
        ) : (
          <TextBlock key={index} value={segment.value} />
        ),
      )}
    </View>
  );
}
