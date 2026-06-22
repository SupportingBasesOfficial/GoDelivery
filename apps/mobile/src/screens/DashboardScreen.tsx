import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
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
}

interface DashboardScreenProps {
  user: AuthUser;
  onSignOut: () => void;
}

export default function DashboardScreen({ user, onSignOut }: DashboardScreenProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const { location, tracking, startTracking, stopTracking } = useLocation(user.id);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, [user.id]);

  async function loadOrders() {
    const { data } = await supabase
      .from("orders")
      .select("id, status, customer_name, customer_phone, pickup_address, delivery_address, delivery_fee")
      .eq("courier_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
  }

  async function updateOrderStatus(orderId: string, status: string) {
    setLoading(true);
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) {
      Alert.alert("Erro", error.message);
    } else {
      await loadOrders();
    }
    setLoading(false);
  }

  const statusLabels: Record<string, string> = {
    accepted: "Aceito — Coletar pedido",
    collected: "Coletado — Em rota",
    in_transit: "Em rota — Entregar",
    delivered: "Entregue",
  };

  const nextStatus: Record<string, string> = {
    accepted: "collected",
    collected: "in_transit",
    in_transit: "delivered",
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GoDelivery Courier</Text>
        <TouchableOpacity onPress={onSignOut}>
          <Text style={styles.logout}>Sair</Text>
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
            {tracking ? "Parar GPS" : "Iniciar GPS"}
          </Text>
        </TouchableOpacity>
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

            {item.status !== "delivered" && item.status !== "rejected" && (
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
                      : item.status === "in_transit"
                        ? "Confirmar entrega"
                        : "Atualizar"}
                </Text>
              </TouchableOpacity>
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
  logout: {
    color: "#ef4444",
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
  actionButton: {
    marginTop: 10,
    backgroundColor: "#10b981",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
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
});
