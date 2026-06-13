import { View } from 'react-native';

import { Text } from './text';

const PASTELS: [string, string][] = [
  ['#C7D2FE', '#4338CA'],
  ['#BBF7D0', '#166534'],
  ['#FDE68A', '#92400E'],
  ['#FECDD3', '#9F1239'],
  ['#BAE6FD', '#075985'],
  ['#DDD6FE', '#5B21B6'],
];

export interface AvatarProps {
  name: string;
  size?: number;
}

/** Initials avatar with a stable pastel derived from the name. */
export function Avatar({ name, size = 44 }: AvatarProps) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const [bg, fg] = PASTELS[hash % PASTELS.length] ?? PASTELS[0]!;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: bg }}
      accessibilityLabel={name}
    >
      <Text weight="bold" style={{ color: fg, fontSize: size * 0.38, lineHeight: size * 0.48 }}>
        {initials || '?'}
      </Text>
    </View>
  );
}
