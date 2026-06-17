# Patwadi App - Setup Guide (After Laptop Reconfiguration)

## Missing Configuration Items

After a laptop reconfiguration, these are typically missing:

### 1. Environment Variables (.env.local file)

Create a file named `.env.local` in the project root with:

```env
# Supabase Configuration
# Get these from your Supabase project dashboard: https://app.supabase.com
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON=your-anon-key-here

# Mapbox Configuration  
# Get your token from: https://account.mapbox.com/access-tokens/
EXPO_PUBLIC_MAPBOX_TOKEN=your-mapbox-token-here
```

**Important:** Replace the placeholder values with your actual API keys.

### 2. Android SDK Path

If `adb` command is not recognized, add Android SDK to your PATH:

**On Windows:**
1. Find your Android SDK location (usually `C:\Users\YourName\AppData\Local\Android\Sdk` or `C:\Android\Sdk`)
2. Add to System PATH:
   - `%LOCALAPPDATA%\Android\Sdk\platform-tools`
   - `%LOCALAPPDATA%\Android\Sdk\tools`

**Or temporarily set in PowerShell:**
```powershell
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
```

### 3. Verify Setup

Run these commands to verify:

```powershell
# Check Node.js
node --version
npm --version

# Check Expo CLI
npx expo --version

# Check Android SDK (after adding to PATH)
adb version

# Check environment variables are loaded
npx expo start
# (Watch console for Supabase/Mapbox validation messages)
```

### 4. Reinstall Dependencies (if needed)

If packages seem outdated or missing:

```powershell
npm install
```

### 5. Start the App

Once environment variables are set and Android SDK is configured:

```powershell
# Start Metro bundler and launch Android
npx expo start --android

# Or use npm script
npm start
# Then press 'a' for Android
```

## Troubleshooting

### "ADB not recognized"
- Install Android Studio
- Open Android Studio → Settings → Appearance & Behavior → System Settings → Android SDK
- Note the "Android SDK Location"
- Add `[SDK Location]\platform-tools` to your PATH

### "Missing EXPO_PUBLIC_SUPABASE_URL"
- Create `.env.local` file (see step 1 above)
- Restart your terminal/IDE
- Ensure `.env.local` is in the project root (same folder as `package.json`)

### "Missing EXPO_PUBLIC_MAPBOX_TOKEN"
- Sign up at https://mapbox.com
- Get your access token from https://account.mapbox.com/access-tokens/
- Add to `.env.local`

### "Cannot connect to emulator"
- Ensure Android emulator is running
- Check `adb devices` shows your emulator
- Try restarting the emulator

## Quick Start Checklist

- [ ] `.env.local` file exists with correct API keys
- [ ] Android SDK is installed and in PATH
- [ ] `node_modules` exists (run `npm install` if not)
- [ ] Android emulator is running
- [ ] Run `npx expo start --android`





