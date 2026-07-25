import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";

import { HomeShell } from "./screens/HomeShell";
import ProfileSetupScreen from "./screens/ProfileSetupScreen";
import { RootState } from "./store";
import { isProfileComplete } from "./utils/profile";

export type AppStackParamList = {
  ProfileSetup: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <Stack.Navigator
      initialRouteName={isProfileComplete(user) ? "Home" : "ProfileSetup"}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#050505" },
      }}
    >
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Home" component={HomeShell} />
    </Stack.Navigator>
  );
}
