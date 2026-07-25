import React from "react";
import {
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { Provider, useSelector } from "react-redux";
import { store, RootState } from "./src/store";
import { AppNavigator } from "./src/AppNavigator";
import { AuthNavigator } from "./src/AuthNavigator";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#050505",
    card: "#050505",
    border: "#050505",
    text: "#F5F7FA",
    primary: "#20E6A4",
  },
};

function RootNavigation() {
  const token = useSelector((state: RootState) => state.auth.token);
  return token ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigation />
      </NavigationContainer>
    </Provider>
  );
}
