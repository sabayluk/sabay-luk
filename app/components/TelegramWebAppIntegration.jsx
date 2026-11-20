'use client';

import { useEffect } from 'react';

export default function TelegramWebAppIntegration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initTg = () => {
      const tg = window.Telegram?.WebApp;
      if (!tg) return;

      try {
        // 1. Tell Telegram that Mini App is initialized & ready to render
        tg.ready();

        // 2. Expand to full height (Native app experience without bottom sheet)
        tg.expand();

        // 3. Set header color to match brand primary orange
        if (typeof tg.setHeaderColor === 'function') {
          tg.setHeaderColor('#ff6a00');
        }
        if (typeof tg.setBackgroundColor === 'function') {
          tg.setBackgroundColor(tg.colorScheme === 'dark' ? '#0b0f19' : '#ffffff');
        }

        // 3.1 Synchronize theme dynamically if Telegram theme changes
        const syncTgTheme = () => {
          const isDark = tg.colorScheme === 'dark';
          document.documentElement.classList.toggle('dark', isDark);
          if (typeof tg.setBackgroundColor === 'function') {
            tg.setBackgroundColor(isDark ? '#0b0f19' : '#ffffff');
          }
        };
        if (typeof tg.onEvent === 'function') {
          tg.onEvent('themeChanged', syncTgTheme);
        }

        // 4. Enable confirmation when user swipes down to close (prevents accidental closing)
        if (typeof tg.enableClosingConfirmation === 'function') {
          tg.enableClosingConfirmation();
        }

        // 5. Detect and store Telegram user info if launched inside Telegram
        const user = tg.initDataUnsafe?.user;
        if (user) {
          const tgUser = {
            id: user.id,
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            username: user.username || '',
            fullName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.first_name || '',
            languageCode: user.language_code || 'km',
            isPremium: !!user.is_premium
          };
          localStorage.setItem('sabay_tg_user', JSON.stringify(tgUser));

          // Notify storefront & checkout forms immediately
          window.dispatchEvent(new CustomEvent('sabay_tg_user_ready', { detail: tgUser }));
        }

        // 6. Global Haptic Feedback helper for native touch vibrations
        window.sabayHaptic = {
          light: () => tg.HapticFeedback?.impactOccurred('light'),
          medium: () => tg.HapticFeedback?.impactOccurred('medium'),
          heavy: () => tg.HapticFeedback?.impactOccurred('heavy'),
          success: () => tg.HapticFeedback?.notificationOccurred('success'),
          warning: () => tg.HapticFeedback?.notificationOccurred('warning'),
          error: () => tg.HapticFeedback?.notificationOccurred('error')
        };

        console.log('🤖 [Telegram Mini App SDK] Initialized successfully!', {
          platform: tg.platform,
          version: tg.version,
          colorScheme: tg.colorScheme,
          user: user?.first_name
        });
      } catch (err) {
        console.warn('Telegram WebApp init warning:', err);
      }
    };

    if (window.Telegram?.WebApp) {
      initTg();
    } else {
      window.addEventListener('load', initTg);
      const timer = setTimeout(initTg, 500);
      return () => {
        window.removeEventListener('load', initTg);
        clearTimeout(timer);
      };
    }
  }, []);

  return null;
}
