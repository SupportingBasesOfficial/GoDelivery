"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ReportsData } from "../../actions/reports";

const STATUS_COLORS: Record<string, string> = {
  draft: "#9ca3af",
  pending_courier: "#f59e0b",
  accepted: "#3b82f6",
  collected: "#8b5cf6",
  in_transit: "#6366f1",
  delivered: "#16a34a",
  rejected: "#ef4444",
  cancelled: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_courier: "Aguardando motoboy",
  accepted: "Aceito",
  collected: "Coletado",
  in_transit: "Em rota",
  delivered: "Entregue",
  rejected: "Recusado",
  cancelled: "Cancelado",
};

interface ChartsProps {
  data: ReportsData;
}

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

export function OrdersDailyChart({ data }: ChartsProps) {
  const chartData = data.daily.map((d) => ({
    date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    pedidos: d.orders,
    entregues: d.delivered,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPedidos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorEntregues" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Area
            type="monotone"
            dataKey="pedidos"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorPedidos)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="entregues"
            stroke="#16a34a"
            fillOpacity={1}
            fill="url(#colorEntregues)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueDailyChart({ data }: ChartsProps) {
  const chartData = data.daily.map((d) => ({
    date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    receita: d.revenue,
    taxas: d.fees,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
            formatter={(value: any) => [formatCurrency(Number(value)), ""]}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="receita" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="taxas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPieChart({ data }: ChartsProps) {
  const overall = data.overall;
  const chartData = [
    { name: "Entregues", value: overall.deliveredOrders, color: STATUS_COLORS.delivered },
    { name: "Cancelados", value: overall.cancelledOrders, color: STATUS_COLORS.cancelled },
    { name: "Recusados", value: overall.rejectedOrders, color: STATUS_COLORS.rejected },
    {
      name: "Em andamento",
      value: overall.totalOrders - overall.deliveredOrders - overall.cancelledOrders - overall.rejectedOrders,
      color: STATUS_COLORS.in_transit,
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CourierPerformanceChart({ data }: ChartsProps) {
  const chartData = data.couriers.slice(0, 8).map((c) => ({
    nome: c.courierName.split(" ")[0],
    entregues: c.delivered,
    recusados: c.rejected,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="entregues" fill="#16a34a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="recusados" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
