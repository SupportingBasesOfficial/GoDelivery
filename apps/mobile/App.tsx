import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "./src/hooks/useAuth";
import { usePushNotifications } from "./src/hooks/usePushNotifications";
import { initSentry } from "./src/lib/sentry";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

// Inicializa Sentry antes de qualquer coisa
initSentry();

type Screen = "dashboard" | "profile";

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const { user, loading, signIn, signOut } = useAuth();

  usePushNotifications(user?.id ?? null);

  if (loading) {
    return null; // Splash screen em producao
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={signIn} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (screen === "profile") {
    return (
      <>
        <ProfileScreen user={user} onBack={() => setScreen("dashboard")} onSignOut={signOut} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      <DashboardScreen user={user} onProfile={() => setScreen("profile")} onSignOut={signOut} />
      <StatusBar style="auto" />
    </>
  );
}
