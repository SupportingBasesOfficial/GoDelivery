import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, Linking, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocation } from "../hooks/useLocation";
import { supabase } from "../lib/supabase";
import type { AuthUser } from "../hooks/useAuth";

interface Order {
  id: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  delivery_address: string;
  delivery_fee: number;
  proof_image_url: string | null;
  proof_uploaded_at: string | null;
}

interface DashboardScreenProps {
  user: AuthUser;
  onProfile: () => void;
  onSignOut: () => void;
}

export default function DashboardScreen({ user, onProfile, onSignOut: _onSignOut }: DashboardScreenProps) {
  // _onSignOut intencionalmente nao usado nesta tela — logout via App.tsx
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const { location, tracking, startTracking, stopTracking } = useLocation(user.id);

  useEffect(() => {
    // Busca token push salvo no banco para debug
    supabase
      .from("couriers")
      .select("fcm_token, status")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setPushToken(data?.fcm_token ?? null);
        console.warn("[Debug] courier status:", data?.status, "token:", data?.fcm_token ? "OK" : "FALTANDO");
      });
  }, [user.id]);

  // GPS automatico: liga automaticamente quando ha pedido ativo
  // NUNCA desliga automaticamente — motoboy controla manualmente via botao
  useEffect(() => {
    const hasActiveOrder = orders.some(
      (o) => o.status === "accepted" || o.status === "collected" || o.status === "in_transit"
    );

    if (hasActiveOrder && !tracking) {
      console.warn("[AutoGPS] Pedido ativo detectado — iniciando rastreamento");
      startTracking();
    }
  }, [orders, tracking, startTracking]);

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, status, customer_name, customer_phone, pickup_address, delivery_address, delivery_fee, proof_image_url, proof_uploaded_at")
      .eq("courier_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
  }, [user.id]);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("orders_courier_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `courier_id=eq.${user.id}`,
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, loadOrders]);

  async function updateOrderStatus(orderId: string, status: string) {
    setLoading(true);

    const updateData: Record<string, string | null> = { status };
    const now = new Date().toISOString();

    if (status === "accepted") updateData.accepted_at = now;
    if (status === "collected") updateData.collected_at = now;
    if (status === "in_transit") updateData.in_transit_at = now;
    if (status === "delivered") updateData.delivered_at = now;
    if (status === "rejected") updateData.rejected_at = now;

    const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
    if (error) {
      Alert.alert("Erro", error.message);
    } else {
      await loadOrders();
    }
    setLoading(false);
  }

  const statusLabels: Record<string, string> = {
    pending_courier: "Novo pedido — Aceitar?",
    accepted: "Aceito — Coletar pedido",
    collected: "Coletado — Em rota",
    in_transit: "Em rota — Entregar",
    delivered: "Entregue",
    rejected: "Recusado",
    cancelled: "Cancelado",
  };

  const nextStatus: Record<string, string> = {
    accepted: "collected",
    collected: "in_transit",
    in_transit: "delivered",
  };

  function openNavigation(address: string) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Erro", "Não foi possível abrir o mapa");
    });
  }

  async function uploadProof(orderId: string) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão negada", "Precisamos acessar suas fotos para enviar o comprovante.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const fileName = `${orderId}/${Date.now()}.jpg`;

    setLoading(true);

    // Upload para o Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("delivery-proofs")
      .upload(fileName, {
        uri: asset.uri,
        type: "image/jpeg",
        name: fileName,
      } as unknown as File, {
        contentType: "image/jpeg",
      });

    if (uploadError) {
      Alert.alert("Erro no upload", uploadError.message);
      setLoading(false);
      return;
    }

    // Obtem URL publica
    const { data: urlData } = supabase.storage.from("delivery-proofs").getPublicUrl(fileName);
    const publicUrl = urlData?.publicUrl ?? "";

    // Atualiza o pedido
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        proof_image_url: publicUrl,
        proof_uploaded_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      Alert.alert("Erro ao atualizar pedido", updateError.message);
    } else {
      Alert.alert("Sucesso", "Comprovante enviado!");
      await loadOrders();
    }

    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GoDelivery Courier</Text>
        <TouchableOpacity onPress={onProfile}>
          <Text style={styles.profile}>👤 Perfil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.locationBar}>
        <Text style={styles.locationText}>
          {location
            ? `Lat: ${location.latitude.toFixed(5)} Lng: ${location.longitude.toFixed(5)}`
            : "Localização não disponível"}
        </Text>
        <TouchableOpacity
          style={[styles.trackButton, tracking ? styles.trackButtonActive : null]}
          onPress={tracking ? stopTracking : startTracking}
        >
          <Text style={styles.trackButtonText}>
            {tracking ? "🔴 GPS ativo (auto)" : "⚪ GPS inativo"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debug Panel */}
      <View style={styles.debugPanel}>
        <Text style={styles.debugText}>
          Auto-GPS: {tracking ? "Rastreando" : "Aguardando pedido"} | Push: {pushToken ? "OK" : "Faltando"}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Pedidos atribuídos</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <Text style={styles.customer}>{item.customer_name}</Text>
            <Text style={styles.phone}>{item.customer_phone}</Text>
            <Text style={styles.address}>Coleta: {item.pickup_address}</Text>
            <Text style={styles.address}>Entrega: {item.delivery_address}</Text>
            <Text style={styles.fee}>Taxa: R$ {item.delivery_fee.toFixed(2)}</Text>
            <Text style={styles.status}>{statusLabels[item.status] ?? item.status}</Text>

            {item.status === "pending_courier" && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => updateOrderStatus(item.id, "accepted")}
                  disabled={loading}
                >
                  <Text style={styles.actionButtonText}>Aceitar pedido</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => updateOrderStatus(item.id, "rejected")}
                  disabled={loading}
                >
                  <Text style={styles.actionButtonText}>Recusar</Text>
                </TouchableOpacity>
              </View>
            )}

            {(item.status === "accepted" || item.status === "collected" || item.status === "in_transit") && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => updateOrderStatus(item.id, nextStatus[item.status] ?? item.status)}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>
                  {item.status === "accepted"
                    ? "Confirmar coleta"
                    : item.status === "collected"
                      ? "Iniciar entrega"
                      : "Confirmar entrega"}
                </Text>
              </TouchableOpacity>
            )}

            {(item.status === "accepted" || item.status === "collected" || item.status === "in_transit") && (
              <View style={styles.navRow}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => openNavigation(item.pickup_address)}
                >
                  <Text style={styles.navButtonText}>🗺️ Ir para coleta</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => openNavigation(item.delivery_address)}
                >
                  <Text style={styles.navButtonText}>🗺️ Ir para entrega</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Upload de comprovante */}
            {item.status === "in_transit" && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#8b5cf6" }]}
                onPress={() => uploadProof(item.id)}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>
                  📷 Enviar comprovante de entrega
                </Text>
              </TouchableOpacity>
            )}

            {item.proof_image_url && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Comprovante enviado:
                </Text>
                <Image
                  source={{ uri: item.proof_image_url }}
                  style={{ width: "100%", height: 200, borderRadius: 8 }}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum pedido atribuído no momento.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111",
  },
  profile: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  locationBar: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationText: {
    fontSize: 12,
    color: "#666",
  },
  trackButton: {
    backgroundColor: "#2563EB",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  trackButtonActive: {
    backgroundColor: "#ef4444",
  },
  trackButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  debugPanel: {
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 11,
    color: "#6b7280",
    fontFamily: "monospace",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  customer: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111",
  },
  phone: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  address: {
    fontSize: 13,
    color: "#444",
    marginBottom: 2,
  },
  fee: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
    marginTop: 6,
  },
  status: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#10b981",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#10b981",
  },
  rejectButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  empty: {
    textAlign: "center",
    color: "#9ca3af",
    marginTop: 40,
  },
  navRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  navButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  navButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 12,
  },
});
