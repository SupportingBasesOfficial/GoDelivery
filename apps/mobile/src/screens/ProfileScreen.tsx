import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProfileData | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("couriers")
      .select("vehicle_type, vehicle_plate, total_deliveries, total_earnings, status, profiles (full_name, phone)")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("[Profile] Erro ao carregar:", error.message);
      Alert.alert("Erro", "Não foi possível carregar o perfil.");
      setLoading(false);
      return;
    }

    const profilesArr = data.profiles as Array<{ full_name?: string; phone?: string }> | null;
    const profiles = profilesArr?.[0] ?? null;

    const loaded: ProfileData = {
      full_name: profiles?.full_name ?? null,
      phone: profiles?.phone ?? null,
      vehicle_type: data.vehicle_type,
      vehicle_plate: data.vehicle_plate,
      total_deliveries: data.total_deliveries ?? 0,
      total_earnings: data.total_earnings ?? 0,
      status: data.status ?? "offline",
    };

    setProfile(loaded);
    setForm(loaded);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!form) return;

    setSaving(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name?.trim() || null,
        phone: form.phone?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("[Profile] Erro ao salvar profiles:", profileError.message);
      Alert.alert("Erro", "Não foi possível salvar os dados pessoais.");
      setSaving(false);
      return;
    }

    const { error: courierError } = await supabase
      .from("couriers")
      .update({
        vehicle_type: form.vehicle_type?.trim().toLowerCase() || null,
        vehicle_plate: form.vehicle_plate?.trim().toUpperCase() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (courierError) {
      console.error("[Profile] Erro ao salvar couriers:", courierError.message);
      Alert.alert("Erro", "Não foi possível salvar os dados do veículo.");
      setSaving(false);
      return;
    }

    setProfile(form);
    setIsEditing(false);
    setSaving(false);
    Alert.alert("Sucesso", "Perfil atualizado!");
  };

  const handleCancel = () => {
    setForm(profile);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Meu Perfil</Text>
        <TouchableOpacity
          onPress={() => (isEditing ? handleCancel() : setIsEditing(true))}
          disabled={saving}
        >
          <Text style={[styles.edit, saving && styles.disabled]}>
            {isEditing ? "Cancelar" : "Editar"}
          </Text>
        </TouchableOpacity>
      </View>

      {profile && form && (
        <View style={styles.card}>
          {isEditing ? (
            <>
              <Text style={styles.sectionLabel}>Dados pessoais</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome</Text>
                <TextInput
                  style={styles.input}
                  value={form.full_name ?? ""}
                  onChangeText={(text) => setForm({ ...form, full_name: text })}
                  placeholder="Seu nome completo"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefone</Text>
                <TextInput
                  style={styles.input}
                  value={form.phone ?? ""}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  placeholder="(47) 99999-9999"
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Veiculo</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo (moto, bike, carro)</Text>
                <TextInput
                  style={styles.input}
                  value={form.vehicle_type ?? ""}
                  onChangeText={(text) => setForm({ ...form, vehicle_type: text })}
                  placeholder="moto"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Placa</Text>
                <TextInput
                  style={styles.input}
                  value={form.vehicle_plate ?? ""}
                  onChangeText={(text) => setForm({ ...form, vehicle_plate: text })}
                  placeholder="ABC1D23"
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar alteracoes</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.name}>{profile.full_name ?? "Entregador"}</Text>
              <Text style={styles.email}>{user.email}</Text>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Status</Text>
                <Text
                  style={[
                    styles.value,
                    profile.status === "available" ? styles.online : styles.offline,
                  ]}
                >
                  {profile.status === "available" ? "Disponivel" : profile.status === "busy" ? "Em entrega" : "Offline"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Telefone</Text>
                <Text style={styles.value}>{profile.phone ?? "—"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Veiculo</Text>
                <Text style={styles.value}>{profile.vehicle_type ?? "—"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Placa</Text>
                <Text style={styles.value}>{profile.vehicle_plate ?? "—"}</Text>
              </View>
            </>
          )}
        </View>
      )}

      {!isEditing && (
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Estatisticas</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile?.total_deliveries ?? 0}</Text>
              <Text style={styles.statLabel}>Entregas</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                R$ {(profile?.total_earnings ?? 0).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Ganhos</Text>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6b7280" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  back: { color: "#3b82f6", fontSize: 14 },
  title: { fontSize: 18, fontWeight: "bold", color: "#111" },
  edit: { color: "#3b82f6", fontSize: 14, fontWeight: "500" },
  disabled: { opacity: 0.5 },
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fafafa",
  },
  saveButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: { backgroundColor: "#93c5fd" },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
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
    marginBottom: 24,
  },
  signOutText: { color: "#dc2626", fontWeight: "600", fontSize: 16 },
});
