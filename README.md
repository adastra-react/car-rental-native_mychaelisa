# Car Rental Native

This is the React Native rebuild foundation for the Flutter `car_rental_app`.

## What is already ported

- Shared design tokens for spacing, radii, colors, and typography
- Renter/host mode switch
- Floating-center bottom navigation inspired by the Flutter app
- Renter home shell with featured vehicle cards
- Host dashboard shell with metrics and task list
- Placeholder screens for explore, trips, messages, listings, calendar, and profile

## Important environment note

Expo in this project requires a newer Node version than the machine is currently using in some shells.

Use Node `20.19.4` or newer before running the app.

## Run locally

From the repo root:

```bash
cd "car-rental-native"
npm install
npx expo start
```

For web:

```bash
npx expo start --web
```

## Current structure

- `App.tsx`: app entry
- `src/theme/tokens.ts`: shared design tokens
- `src/components/BottomNav.tsx`: renter/host bottom navigation
- `src/components/ModeSwitch.tsx`: renter/host toggle
- `src/screens/HomeShell.tsx`: current shell and starter screens
- `src/data/mockVehicles.ts`: starter mock data

## Recommended next porting steps

1. Port the onboarding and auth screens from Flutter.
2. Port the explore and vehicle detail flows.
3. Port listings create/edit flows for hosts.
4. Reconnect data/auth to a real backend in JavaScript instead of Dart.
