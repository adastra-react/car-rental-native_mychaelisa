import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { AuthResponse, AuthUser } from "../types/auth";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  status: "idle" | "loading";
  error: string | null;
};

const initialState: AuthState = {
  token: null,
  user: null,
  status: "idle",
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authStarted(state) {
      state.status = "loading";
      state.error = null;
    },
    setSession(state, action: PayloadAction<AuthResponse>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.status = "idle";
      state.error = null;
    },
    updateUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.status = "idle";
      state.error = null;
    },
    authFailed(state, action: PayloadAction<string>) {
      state.status = "idle";
      state.error = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
    },
    signOut(state) {
      state.token = null;
      state.user = null;
      state.status = "idle";
      state.error = null;
    },
  },
});

export const {
  authFailed,
  authStarted,
  clearAuthError,
  setSession,
  signOut,
  updateUser,
} = authSlice.actions;
export default authSlice.reducer;
