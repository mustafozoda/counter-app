import { Stack } from 'expo-router';

// Without this, expo-router falls back to the alphabetically-first route when
// the (auth) group is entered with no screen specified — which is
// `forgot-password`, not `sign-in`. Anchor the group to sign-in.
export const unstable_settings = {
  initialRouteName: 'sign-in',
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
