import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";
import type { AuthUser } from "../hooks/useAuth";

interface ProfileData {
  full_name: string | null;
  phone: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  total_deliveries: number;
  total_earnings: number;
  status: string;
}

interface ProfileScreenProps {
  user: AuthUser;
  onBack: () => void;
  onSignOut: () => void;
}

export default function ProfileScreen({ user, onBack, onSignOut }: ProfileScreenProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from("couriers")
      .select("vehicle_type, vehicle_plate, total_deliveries, total_earnings, status, profiles (full_name, phone)")
      .eq("id", user.id)
      .single();

    if (data) {
      // profiles vem como array por causa do join
      const profilesArr = data.profiles as Array<{ full_name?: string; phone?: string }> | null;
      const profiles = profilesArr?.[0] ?? null;
      setProfile({
        full_name: profiles?.full_name ?? null,
        phone: profiles?.phone ?? null,
        vehicle_type: data.vehicle_type,
        vehicle_plate: data.vehicle_plate,
        total_deliveries: data.total_deliveries ?? 0,
        total_earnings: data.total_earnings ?? 0,
        status: data.status ?? "offline",
      });
    }
  }, [user.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Meu Perfil</Text>
        <View style={{ width: 50 }} />
      </View>

      {profile && (
        <View style={styles.card}>
          <Text style={styles.name}>{profile.full_name ?? "Motoboy"}</Text>
          <Text style={styles.email}>{user.email}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Status</Text>
            <Text style={[styles.value, profile.status === "online" ? styles.online : styles.offline]}>
              {profile.status === "online" ? "🟢 Online" : "🔴 Offline"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Telefone</Text>
            <Text style={styles.value}>{profile.phone ?? "—"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Veículo</Text>
            <Text style={styles.value}>{profile.vehicle_type ?? "—"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Placa</Text>
            <Text style={styles.value}>{profile.vehicle_plate ?? "—"}</Text>
          </View>
        </View>
      )}

      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Estatísticas</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.total_deliveries ?? 0}</Text>
            <Text style={styles.statLabel}>Entregas</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>R$ {(profile?.total_earnings ?? 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Ganhos</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  back: { color: "#3b82f6", fontSize: 14 },
  title: { fontSize: 18, fontWeight: "bold", color: "#111" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: "bold", color: "#111" },
  email: { fontSize: 14, color: "#6b7280", marginBottom: 12 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  label: { fontSize: 14, color: "#6b7280" },
  value: { fontSize: 14, fontWeight: "500", color: "#111" },
  online: { color: "#16a34a" },
  offline: { color: "#ef4444" },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111", marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 16 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "bold", color: "#3b82f6" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  signOutButton: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  signOutText: { color: "#dc2626", fontWeight: "600", fontSize: 16 },
});
