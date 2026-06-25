import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications(userId: string | null) {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!userId) return;

    registerForPushNotificationsAsync(userId);

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("[Push] Notificacao recebida:", notification);
        const title = notification.request.content.title ?? "GoDelivery";
        const body = notification.request.content.body ?? "";
        Alert.alert(title, body);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("[Push] Usuario tocou na notificacao:", response);
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [userId]);
}

async function registerForPushNotificationsAsync(userId: string) {
  console.log("[Push] Registrando push token para userId:", userId);

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log("[Push] Status existente:", existingStatus);
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log("[Push] Novo status apos request:", finalStatus);
  }

  if (finalStatus !== "granted") {
    console.log("[Push] Permissao negada pelo usuario");
    return;
  }

  try {
    const projectId = (Constants.expoConfig?.extra?.eas as any)?.projectId as string | undefined;
    if (!projectId || projectId === "__PLACEHOLDER_PROJECT_ID__") {
      console.error("[Push] projectId nao configurado. Adicione seu projectId do EAS em app.json > expo.extra.eas.projectId");
      console.error("[Push] Para obter o projectId, execute: npx eas project:info  ou acesse https://expo.dev");
      return;
    }
    console.log("[Push] Usando projectId:", projectId.substring(0, 8) + "...");
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log("[Push] Expo push token obtido:", token);

    const { error } = await supabase
      .from("couriers")
      .update({ fcm_token: token })
      .eq("id", userId);

    if (error) {
      console.error("[Push] Erro ao salvar token no Supabase:", error.message);
    } else {
      console.log("[Push] Token salvo com sucesso no Supabase");
    }
  } catch (err) {
    console.error("[Push] Erro ao obter token:", err);
  }
}
