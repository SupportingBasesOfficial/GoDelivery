import { StatusBar } from "expo-status-bar";
import { useAuth } from "./src/hooks/useAuth";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";

export default function App() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return null; // Splash screen em produção
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={signIn} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      <DashboardScreen user={user} onSignOut={signOut} />
      <StatusBar style="auto" />
    </>
  );
}
