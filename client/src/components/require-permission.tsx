import { Lock } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';
import { usePermission, type Permission } from '@/stores/staff';

/** Shown when the signed-in role lacks permission for a screen. */
export function NoAccess() {
  const { t } = useTranslation();
  return (
    <Screen>
      <View className="flex-1 justify-center">
        <EmptyState icon={Lock} title={t('access.deniedTitle')} message={t('access.deniedBody')} />
      </View>
    </Screen>
  );
}

/**
 * Wraps a screen so it renders only when the user's role has `permission`,
 * otherwise a friendly no-access state. The guard always calls exactly one hook
 * (usePermission), keeping hook order stable regardless of the wrapped screen.
 */
export function withPermission<P extends object>(
  Component: ComponentType<P>,
  permission: Permission,
): ComponentType<P> {
  function PermissionGuarded(props: P) {
    const allowed = usePermission(permission);
    if (!allowed) return <NoAccess />;
    return <Component {...props} />;
  }
  PermissionGuarded.displayName = `withPermission(${Component.displayName ?? Component.name ?? 'Screen'})`;
  return PermissionGuarded;
}
