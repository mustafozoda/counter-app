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
      <Stack.Screen name="finance" />
      <Stack.Screen name="financing" />
      <Stack.Screen name="plan/[id]" />
      <Stack.Screen name="suppliers" />
      <Stack.Screen name="supplier/[id]" />
      <Stack.Screen name="promotions" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="staff" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="profile-edit" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="assistant" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
