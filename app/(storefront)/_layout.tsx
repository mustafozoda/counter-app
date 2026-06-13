import { Stack } from 'expo-router';

export default function StorefrontLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="checkout" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
