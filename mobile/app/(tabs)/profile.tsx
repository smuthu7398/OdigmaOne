import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { signOut, useSession } from "../../lib/auth-client";
import { initials } from "../../lib/api";
import { colors, radius } from "../../lib/theme";

export default function ProfileScreen() {
  const { data: session } = useSession();
  const user = session?.user;

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user ? initials(user.name) : "…"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {(user as { timezone?: string } | undefined)?.timezone ??
              "Asia/Kolkata"}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.hint}>
          Change your password and manage notifications from the web app —
          Settings.
        </Text>
      </View>

      <Pressable style={styles.signOut} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={16} color={colors.destructive} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 20,
    alignItems: "center",
    gap: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 20 },
  name: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  email: { fontSize: 13, color: colors.muted },
  badge: {
    marginTop: 8,
    backgroundColor: colors.raised,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: colors.muted },
  hint: { fontSize: 13, color: colors.muted, textAlign: "center" },
  signOut: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 12,
  },
  signOutText: { color: colors.destructive, fontWeight: "700", fontSize: 14 },
});
