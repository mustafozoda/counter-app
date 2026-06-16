import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';

/** Shown when the signed-in member has been suspended by the store owner. */
export default function SuspendedScreen() {
  const { t } = useTranslation();
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <EmptyState
          icon={Lock}
          title={t('suspended.title')}
          message={t('suspended.body')}
          actionLabel={t('more.signOut')}
          onAction={signOut}
        />
      </View>
    </Screen>
  );
}
