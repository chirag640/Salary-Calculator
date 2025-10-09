# 📱 Mobile & PWA Features Documentation

## ✅ Implemented Features

### 1. **Progressive Web App (PWA) Support**

#### What is it?
Your Time Tracker can now be installed as a standalone app on any device, working offline and feeling like a native mobile app.

#### Features:
- **Install on Mobile/Desktop**: Add to home screen
- **Offline Support**: Works without internet (cached data)
- **App-like Experience**: No browser UI, full screen
- **Fast Loading**: Cached assets load instantly
- **Push Notifications**: (Ready for implementation)

#### Files Added:
- `public/manifest.json` - PWA configuration
- `public/sw.js` - Service worker for offline support
- Updated `app/layout.tsx` - PWA meta tags

#### How to Install:
**On Mobile (iOS):**
1. Open in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Name it and tap "Add"

**On Mobile (Android):**
1. Open in Chrome
2. Tap three dots menu
3. Tap "Add to Home Screen"
4. Confirm

**On Desktop:**
1. Look for install icon in address bar
2. Click "Install Time Tracker"
3. App opens in standalone window

---

### 2. **Mobile Navigation Bar**

#### What is it?
Bottom navigation bar for easy thumb access on mobile devices.

#### Features:
- **Fixed Bottom Position**: Always accessible
- **5 Main Sections**: Today, History, Summary, Export, Profile
- **Active State**: Highlighted current section
- **Touch-Optimized**: Large tap targets (64px wide)
- **Auto-Hide on Desktop**: Only shows on mobile

#### Component: `components/mobile-nav.tsx`

#### Navigation Items:
```typescript
Today    - Main dashboard
History  - Past entries
Summary  - Analytics
Export   - Data export
Profile  - User settings
```

---

### 3. **Quick Actions Menu**

#### What is it?
Floating action button (FAB) on mobile, quick action bar on desktop.

#### Features:
- **Floating Button** (Mobile): Bottom-right corner
- **Quick Access** to common actions:
  - Start Timer
  - Log Yesterday's Hours
  - View This Week's Summary
  - Quick Export Data

#### Component: `components/quick-actions-menu.tsx`

#### Usage in Code:
```typescript
<QuickActionsMenu
  onStartTimer={() => {/* scroll to timer */}}
  onLogYesterday={() => {/* set date to yesterday */}}
  onViewWeeklySummary={() => {/* switch to summary tab */}}
  onQuickExport={() => {/* switch to export tab */}}
/>
```

---

### 4. **Enhanced Dark Mode**

#### What is it?
Improved dark mode with system preference detection and accessibility features.

#### Features:
- **System Preference Detection**: Auto-switches with OS
- **High Contrast Mode**: For better visibility
- **Reduced Motion Support**: Respects accessibility settings
- **Smooth Transitions**: No flash when switching themes

#### Components Added:
- `hooks/use-theme-preferences.ts` - Theme detection hooks
- `components/system-theme-adapter.tsx` - Auto theme adapter

#### Hooks Available:
```typescript
useSystemTheme()         // Current theme (light/dark)
usePrefersDark()         // System prefers dark?
usePrefersReducedMotion() // User wants less motion?
useHighContrast()        // High contrast mode?
```

---

### 5. **Mobile-First Optimizations**

#### Touch Targets:
- **Minimum 44x44px**: All interactive elements
- **Larger Buttons**: Easy to tap accurately
- **Proper Spacing**: No accidental taps

#### Typography:
- **16px Base**: Prevents zoom on iOS
- **Larger Headings**: Better hierarchy on small screens
- **Readable Line Heights**: Optimized for mobile

#### Layout:
- **Bottom Padding**: Space for mobile nav (80px)
- **Safe Areas**: Respects notches and rounded corners
- **Responsive Containers**: Better padding on mobile

#### Performance:
- **No Pull-to-Refresh**: Prevents accidental refreshes
- **Smooth Scrolling**: `-webkit-overflow-scrolling: touch`
- **Tap Highlighting**: Visual feedback on touch

---

## 📊 Technical Details

### PWA Configuration

**manifest.json:**
```json
{
  "name": "Time Tracker - Salary Calculator",
  "short_name": "TimeTracker",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff"
}
```

**Service Worker (sw.js):**
- Caches static assets
- Enables offline functionality
- Updates on new versions

---

### Mobile Navigation

**Bottom Navigation Bar:**
- Fixed position at bottom
- 64px height
- z-index: 50 (above content)
- Hidden on desktop (md: breakpoint)

**Active State Logic:**
```typescript
const isActive = 
  item.href === "/" 
    ? pathname === "/" && !window.location.hash
    : window.location.hash === item.href
```

---

### Quick Actions

**Mobile (FAB):**
- Fixed bottom-right
- 56x56px circular button
- Opens dropdown menu upward
- z-index: 50

**Desktop:**
- Horizontal card layout
- Inline with page content
- Multiple action buttons visible

---

### Theme System

**CSS Variables Updated:**
```css
/* High contrast mode */
.high-contrast {
  --background: oklch(1 0 0);  /* Pure white */
  --foreground: oklch(0 0 0);  /* Pure black */
  border-width: 2px !important;
  font-weight: 500 !important;
}
```

**Accessibility Classes:**
```css
.reduce-motion *        /* Minimal animations */
.high-contrast *        /* Better contrast */
```

---

## 🎯 Usage Guide

### For Users:

#### Installing as PWA:
1. Open app in browser
2. Look for "Install" prompt
3. Follow device-specific steps above
4. Launch from home screen

#### Using Mobile Navigation:
1. Tap icon at bottom to switch sections
2. Current section highlighted in blue
3. Quick access to all features

#### Quick Actions:
1. Tap floating + button (bottom-right)
2. Select action from menu
3. Instant navigation/execution

#### Dark Mode:
- Auto-switches with system
- Manual toggle in profile (future)
- High contrast if enabled in OS

---

### For Developers:

#### Checking Mobile View:
```typescript
import { useIsMobile } from "@/hooks/use-mobile"

const isMobile = useIsMobile()
if (isMobile) {
  // Show mobile layout
}
```

#### Theme Preferences:
```typescript
import { 
  useSystemTheme,
  useHighContrast,
  usePrefersReducedMotion 
} from "@/hooks/use-theme-preferences"

const theme = useSystemTheme() // "light" | "dark"
const highContrast = useHighContrast()
const reduceMotion = usePrefersReducedMotion()
```

#### Adding to Quick Actions:
```typescript
<QuickActionsMenu
  onMyCustomAction={() => {
    // Your custom logic
  }}
/>
```

---

## 🔧 Configuration

### PWA Icons Required:

Place these in `public/`:
- `icon-192.png` - 192x192px
- `icon-512.png` - 512x512px
- `favicon.ico` - 16x16px, 32x32px

**Generate Icons:**
```bash
# Use a tool like:
# - https://realfavicongenerator.net/
# - https://www.pwabuilder.com/imageGenerator
```

### Service Worker Updates:

Edit `public/sw.js` to change:
- Cache name (version)
- Cached URLs
- Cache strategy (network-first, cache-first, etc.)

---

## 📱 Mobile Breakpoints

```typescript
// Tailwind breakpoints
sm: 640px   // Small phones in landscape
md: 768px   // Tablets / mobile nav hides
lg: 1024px  // Desktop starts
xl: 1280px  // Large desktop
2xl: 1536px // Extra large
```

**Mobile-First Strategy:**
- Base styles for mobile (< 768px)
- `md:` prefix for desktop overrides

---

## 🎨 Design Tokens

### Touch Targets:
```css
min-height: 44px;  /* Apple HIG recommendation */
min-width: 44px;
```

### Safe Areas:
```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

### Typography:
```css
Mobile: 16px base (prevents zoom)
Desktop: 16px base
Headings: 1.5-2rem
```

---

## 🚀 Performance Tips

### PWA Optimization:
1. Keep service worker cache small (< 50MB)
2. Cache only essential assets
3. Use network-first for API calls
4. Update service worker version on deploy

### Mobile Performance:
1. Lazy load off-screen images
2. Use CSS transforms (GPU accelerated)
3. Minimize repaints/reflows
4. Debounce scroll events

### Dark Mode:
1. Use `disableTransitionOnChange` to prevent flash
2. Server-render with system preference
3. Store preference in localStorage
4. Sync across tabs

---

## 🧪 Testing

### PWA Testing:
```bash
# Chrome DevTools
1. Open DevTools
2. Application tab
3. Service Workers section
4. Check "Offline" box
5. Reload page (should work)
```

### Mobile Testing:
```bash
# Chrome DevTools
1. Toggle device toolbar (Cmd/Ctrl + Shift + M)
2. Select device (iPhone, Pixel, etc.)
3. Test touch interactions
4. Check responsive layout
```

### Theme Testing:
```bash
# System Theme
1. Change OS theme (dark/light)
2. App should auto-update

# High Contrast
1. Enable in OS settings
2. Check app applies styles

# Reduced Motion
1. Enable in OS settings
2. Verify animations disabled
```

---

## 🐛 Common Issues

### PWA Not Installing:
- Check HTTPS is enabled
- Verify manifest.json is valid
- Ensure service worker registered
- Check console for errors

### Mobile Nav Not Showing:
- Check screen width < 768px
- Verify `useIsMobile()` hook working
- Check z-index conflicts

### Dark Mode Not Working:
- Clear localStorage
- Check `ThemeProvider` in layout
- Verify CSS variables defined
- Test in incognito mode

### Touch Targets Too Small:
- Check CSS for `min-height: 44px`
- Verify padding on buttons
- Test on real device

---

## 📈 Future Enhancements

### Coming Soon:
1. **Swipe Gestures**: Swipe to delete, swipe between tabs
2. **Push Notifications**: Timer reminders, daily summary
3. **Offline Queue**: Save edits while offline, sync later
4. **Haptic Feedback**: Vibration on actions (mobile)
5. **Biometric Auth**: Fingerprint/Face ID login

### Under Consideration:
1. **Split View** (Tablet): Side-by-side panels
2. **Widget Support**: iOS/Android home screen widgets
3. **Share Sheet**: Share reports via native share
4. **Camera Integration**: Scan receipts/documents
5. **Voice Input**: Voice notes for work descriptions

---

## 🎓 Resources

### PWA:
- [web.dev/progressive-web-apps](https://web.dev/progressive-web-apps)
- [PWA Builder](https://www.pwabuilder.com/)
- [Workbox (Google)](https://developers.google.com/web/tools/workbox)

### Mobile Design:
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines)
- [Material Design](https://material.io/design)
- [iOS Safe Area](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)

### Accessibility:
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [A11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)

---

**Last Updated**: October 8, 2025  
**Version**: 2.0.0 (Mobile-First Update)
