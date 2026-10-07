'use client';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { Share } from '@capacitor/share';
import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';

export const isNative = () => typeof window !== 'undefined' && Capacitor.isNativePlatform();

/**
 * Configure native status bar theming
 */
export async function initStatusBar() {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Light }); // Dark text/icons
    await StatusBar.setBackgroundColor({ color: '#FAF6EF' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn('[Native] StatusBar init error:', err);
  }
}

/**
 * Dismiss native splash screen
 */
export async function hideSplashScreen() {
  if (!isNative()) return;
  try {
    await SplashScreen.hide();
  } catch (err) {
    console.warn('[Native] SplashScreen hide error:', err);
  }
}

/**
 * Register for FCM Push Notifications
 */
export async function registerPushNotifications() {
  if (!isNative()) return null;
  try {
    const permStatus = await PushNotifications.checkPermissions();
    let granted = permStatus.receive === 'granted';
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === 'granted';
    }
    if (granted) {
      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token) => {
        try {
          await fetch('/api/notifications/device-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: token.value,
              platform: 'android'
            })
          });
        } catch (e) {
          console.warn('[Native] Failed to send push token to server:', e);
        }
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Native] Push notification received:', notification);
      });
    }
  } catch (err) {
    console.warn('[Native] PushNotifications error:', err);
  }
}

/**
 * Native Share Helper (WhatsApp, Instagram, System Share)
 */
export async function shareProduct({ title, text, url }) {
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareText = `${text || title}\n\nExplore at MikuMantra: ${shareUrl}`;

  if (isNative()) {
    try {
      await Share.share({
        title: title || 'MikuMantra Fine Jewellery',
        text: shareText,
        url: shareUrl,
        dialogTitle: 'Share with friends & family'
      });
      return true;
    } catch (e) {
      // Fallback
    }
  }

  // Web Share API fallback
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: title || 'MikuMantra Fine Jewellery',
        text: shareText,
        url: shareUrl
      });
      return true;
    } catch (e) {
      // User cancelled or unsupported
    }
  }

  // WhatsApp Direct Link fallback
  if (typeof window !== 'undefined') {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
    return true;
  }
  return false;
}

/**
 * Secure native preferences storage for auth token
 */
export async function setNativeToken(token) {
  if (isNative()) {
    try {
      if (token) {
        await Preferences.set({ key: 'mikumantra_native_token', value: token });
      } else {
        await Preferences.remove({ key: 'mikumantra_native_token' });
      }
    } catch (e) {}
  }
}

export async function getNativeToken() {
  if (isNative()) {
    try {
      const res = await Preferences.get({ key: 'mikumantra_native_token' });
      return res.value || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Native Google Sign-In using Credential Manager (@capgo/capacitor-social-login)
 * Invokes native Google Play Services Credential Manager on Android
 */
export async function nativeGoogleLogin(customClientId) {
  if (!isNative()) return null;
  const clientId = customClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '998849094985-1ec0iv6a0ih2ulrru88vv3ngvcbcv68c.apps.googleusercontent.com';
  
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  await SocialLogin.initialize({
    google: {
      webClientId: clientId,
    }
  });

  const res = await SocialLogin.login({
    provider: 'google',
    options: {
      scopes: ['email', 'profile']
    }
  });

  const idToken = res?.result?.idToken || null;
  const accessToken = res?.result?.accessToken?.token || (typeof res?.result?.accessToken === 'string' ? res?.result?.accessToken : null);

  return { idToken, accessToken, raw: res?.result };
}
