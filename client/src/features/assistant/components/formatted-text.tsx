import { Check, Copy } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

/**
 * Lightweight Markdown renderer tuned for chat replies: fenced code blocks
 * (with a language label + copy button), inline `code`, **bold**, [links](url),
 * `#` headings, `-`/`*`/numbered bullets, and simple pipe tables. Not a full
 * Markdown engine — just enough to make model output read nicely without
 * pulling in a heavy dependency.
 */

interface Segment {
  type: 'text' | 'code';
  value: string;
  lang?: string;
}

const FENCE = /```([a-zA-Z0-9+#.-]*)\n?([\s\S]*?)```/g;

function splitFences(input: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  FENCE.lastIndex = 0;
  while ((match = FENCE.exec(input))) {
    if (match.index > last) segments.push({ type: 'text', value: input.slice(last, match.index) });
    segments.push({
      type: 'code',
      value: (match[2] ?? '').replace(/\n$/, ''),
      lang: match[1] || undefined,
    });
    last = FENCE.lastIndex;
  }
  if (last < input.length) segments.push({ type: 'text', value: input.slice(last) });
  return segments;
}

// Inline spans: **bold**, `code`, [text](url).
const INLINE = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;

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
    } else if (match[4] !== undefined && match[5] !== undefined) {
      const url = match[5];
      nodes.push(
        <Text key={key++} tone="accent" weight="medium" onPress={() => void Linking.openURL(url)}>
          {match[4]}
        </Text>,
      );
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function CodeBlock({
  code,
  lang,
  onCopy,
}: {
  code: string;
  lang?: string;
  onCopy?: (text: string) => void;
}) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    onCopy?.(code);
    haptics.selection();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View className="overflow-hidden rounded-md border border-hairline bg-surface-sunken dark:bg-surface">
      <View className="flex-row items-center justify-between border-b border-hairline px-3 py-1.5">
        <Text variant="micro" weight="medium" tone="tertiary">
          {lang || 'code'}
        </Text>
        {onCopy ? (
          <Pressable
            onPress={copy}
            hitSlop={8}
            accessibilityRole="button"
            className="active:opacity-50"
          >
            {copied ? (
              <Check size={13} color={colors.positive} strokeWidth={2.2} />
            ) : (
              <Copy size={13} color={colors.inkTertiary} strokeWidth={2.2} />
            )}
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10 }}>
        <Text mono variant="caption" tone="secondary" selectable>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

function parseCells(line: string): string[] {
  let cells = line.split('|').map((c) => c.trim());
  if (cells.length > 0 && cells[0] === '') cells = cells.slice(1);
  if (cells.length > 0 && cells[cells.length - 1] === '') cells = cells.slice(0, -1);
  return cells;
}

const TABLE_SEP = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;

function TableBlock({ header, rows }: { header: string[]; rows: string[][] }) {
  return (
    <View className="my-1 overflow-hidden rounded-md border border-hairline">
      <View className="flex-row bg-surface-sunken dark:bg-surface">
        {header.map((cell, idx) => (
          <View key={idx} className="flex-1 border-r border-hairline px-2.5 py-1.5">
            <Text variant="caption" weight="semibold">
              {renderInline(cell)}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, rIdx) => (
        <View key={rIdx} className="flex-row border-t border-hairline">
          {header.map((_, cIdx) => (
            <View key={cIdx} className="flex-1 border-r border-hairline px-2.5 py-1.5">
              <Text variant="caption" tone="secondary">
                {renderInline(row[cIdx] ?? '')}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function TextBlock({ value }: { value: string }) {
  const lines = value.replace(/\n{3,}/g, '\n\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Pipe table: a header row followed by a |---|---| separator.
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      lines[i + 1].includes('-') &&
      TABLE_SEP.test(lines[i + 1])
    ) {
      const header = parseCells(trimmed);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].includes('|') && lines[j].trim().length > 0) {
        rows.push(parseCells(lines[j].trim()));
        j++;
      }
      blocks.push(<TableBlock key={key++} header={header} rows={rows} />);
      i = j;
      continue;
    }

    if (trimmed.length === 0) {
      blocks.push(<View key={key++} className="h-1" />);
      i++;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      const variant = level === 1 ? 'h2' : level === 2 ? 'title' : 'body';
      blocks.push(
        <Text
          key={key++}
          variant={variant}
          weight={level === 3 ? 'semibold' : 'bold'}
          className={level < 3 ? 'mt-1' : ''}
        >
          {renderInline(heading[2] ?? '')}
        </Text>,
      );
      i++;
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      blocks.push(
        <View key={key++} className="flex-row gap-2 pl-1">
          <Text variant="body" tone="secondary">
            {'•'}
          </Text>
          <Text variant="body" className="flex-1" selectable>
            {renderInline(bullet[1] ?? '')}
          </Text>
        </View>,
      );
      i++;
      continue;
    }

    const numbered = /^(\d+)\.\s+(.*)$/.exec(trimmed);
    if (numbered) {
      blocks.push(
        <View key={key++} className="flex-row gap-2 pl-1">
          <Text variant="body" tone="secondary" tabular>
            {numbered[1]}.
          </Text>
          <Text variant="body" className="flex-1" selectable>
            {renderInline(numbered[2] ?? '')}
          </Text>
        </View>,
      );
      i++;
      continue;
    }

    blocks.push(
      <Text key={key++} variant="body" selectable>
        {renderInline(line)}
      </Text>,
    );
    i++;
  }

  return <View className="gap-1.5">{blocks}</View>;
}

export function FormattedText({
  content,
  onCopyCode,
}: {
  content: string;
  onCopyCode?: (text: string) => void;
}) {
  const segments = splitFences(content);
  return (
    <View className="gap-2.5">
      {segments.map((segment, index) =>
        segment.type === 'code' ? (
          <CodeBlock key={index} code={segment.value} lang={segment.lang} onCopy={onCopyCode} />
        ) : (
          <TextBlock key={index} value={segment.value} />
        ),
      )}
    </View>
  );
}
