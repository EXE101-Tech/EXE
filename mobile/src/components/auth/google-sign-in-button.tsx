import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';
import { useAuthStore } from '@/stores/auth-store';

type GoogleSigninLib = typeof import('@react-native-google-signin/google-signin');

/**
 * The Google Sign-In SDK is a native module, absent from Expo Go (importing it there throws at module
 * evaluation). Requiring it lazily keeps that failure local to this button instead of the whole route tree.
 */
let googleLib: GoogleSigninLib | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  googleLib = require('@react-native-google-signin/google-signin');
} catch {
  googleLib = null;
}

let configured = false;

interface GoogleSignInButtonProps {
  label?: string;
  onError?: (message: string) => void;
  acceptedTerms?: boolean;
}

/**
 * Native Google Sign-In. The SDK returns an ID token whose audience is the *web* client ID; the backend
 * (`/auth/google/mobile`) verifies it and returns our own access token.
 */
export function GoogleSignInButton({ label = 'Google', onError, acceptedTerms = false }: GoogleSignInButtonProps) {
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const [busy, setBusy] = useState(false);

  const handlePress = async () => {
    if (busy) return;
    if (!googleLib) {
      onError?.('Đăng nhập Google cần development build (không chạy trong Expo Go).');
      return;
    }
    if (!env.googleWebClientId) {
      onError?.('Chưa cấu hình đăng nhập Google: hãy đặt EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID trong file .env.');
      return;
    }

    const { GoogleSignin, statusCodes, isErrorWithCode } = googleLib;
    setBusy(true);
    try {
      if (!configured) {
        GoogleSignin.configure({ webClientId: env.googleWebClientId });
        configured = true;
      }
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Clear any cached account so the user always gets to pick which Google account to use.
      await GoogleSignin.signOut().catch(() => {});

      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return; // user dismissed the account picker

      const idToken = response.data.idToken;
      if (!idToken) throw new Error('Google không trả về thông tin đăng nhập. Vui lòng thử lại.');
      await loginWithGoogle(idToken, acceptedTerms);
      // Navigation happens in the auth layout once the store flips to authenticated.
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) return;
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          onError?.('Thiết bị chưa có Google Play Services hoặc cần cập nhật.');
          return;
        }
        // Android reports a misconfigured OAuth client (wrong package/SHA-1) as DEVELOPER_ERROR (code 10).
        if (/developer_error|\b10\b/i.test(`${error.code} ${error.message}`)) {
          onError?.('Cấu hình Google chưa khớp (package name hoặc SHA-1 của client Android). Hãy kiểm tra Google Cloud.');
          return;
        }
      }
      onError?.(error instanceof Error ? error.message : 'Không thể đăng nhập bằng Google.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Button variant="outline" onPress={handlePress} loading={busy}>
        <Text className="text-base font-bold text-slate-900 dark:text-white">{label}</Text>
      </Button>
    </View>
  );
}
