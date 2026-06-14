import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { brandGradient } from '@/theme';

import { Text } from './text';

export interface LogoProps {
  size?: number;
  /** Override the glyph — store monograms reuse the brand treatment. */
  letter?: string;
}

/** Brand glyph: gradient rounded square with the Counter "C". */
export function Logo({ size = 56, letter = 'C' }: LogoProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        shadowColor: brandGradient[0],
        shadowOffset: { width: 0, height: size * 0.12 },
        shadowRadius: size * 0.25,
        shadowOpacity: 0.35,
        elevation: 8,
      }}
    >
      <LinearGradient
        colors={[...brandGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          borderRadius: size * 0.3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          variant="display"
          weight="bold"
          tone="inverse"
          style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}
        >
          {letter}
        </Text>
      </LinearGradient>
    </View>
  );
}
