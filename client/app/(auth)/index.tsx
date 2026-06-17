import { Redirect } from 'expo-router';

// Entry point for the (auth) group (the `/` URL when signed out). Without this,
// expo-router resolves `/` to the alphabetically-first route — forgot-password.
// Send people to sign-in instead.
export default function AuthIndex() {
  return <Redirect href="/sign-in" />;
}
