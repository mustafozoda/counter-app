import { Stack } from 'expo-router';

export default function MerchantLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="sell"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="scan"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="product-form" />
      <Stack.Screen name="low-stock" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="receipt/[id]" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="customer/[id]" />
      <Stack.Screen name="order/[id]" />
    </Stack>
  );
}
