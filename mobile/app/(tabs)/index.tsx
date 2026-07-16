import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, initials, taskCode, todayIST, type TaskItem } from "../../lib/api";
import { useSession } from "../../lib/auth-client";
import {
  colors,
  radius,
  STATUS_LABEL,
  PRIORITY_LABEL,
  tint,
} from "../../lib/theme";

function greeting() {
  const h = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  if (h < 12) return "Good morning ☀️";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const { data: session } = useSession();
  const name = session?.user.name ?? "";

  const tasksQuery = useQuery({
    queryKey: ["tasks", "recent"],
    queryFn: () => api<TaskItem[]>("/api/v1/tasks?pageSize=5&sort=-createdAt"),
  });
  const dueQuery = useQuery({
    queryKey: ["tasks", "due-today"],
    queryFn: () => api<TaskItem[]>("/api/v1/tasks?due=today&pageSize=100"),
  });
  const activeQuery = useQuery({
    queryKey: ["tasks", "active-count"],
    queryFn: () => api<TaskItem[]>("/api/v1/tasks?pageSize=1"),
  });

  const dueToday = dueQuery.data?.data.length ?? 0;
  const activeTotal = activeQuery.data?.meta?.total ?? 0;
  const recent = tasksQuery.data?.data ?? [];
  const refreshing =
    tasksQuery.isRefetching || dueQuery.isRefetching || activeQuery.isRefetching;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              tasksQuery.refetch();
              dueQuery.refetch();
              activeQuery.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <View>
            <Text style={styles.greet}>{greeting()}</Text>
            <Text style={styles.name}>{name}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Tasks due today</Text>
          <Text style={styles.heroBig}>
            {dueToday} <Text style={styles.heroSmall}>of {activeTotal} open</Text>
          </Text>
          <View style={styles.heroRow}>
            <Pressable
              style={styles.heroPill}
              onPress={() => router.push("/(tabs)/log")}
            >
              <Text style={styles.heroPillText}>▶ Log Work</Text>
            </Pressable>
            <Pressable
              style={[styles.heroPill, styles.heroPillGhost]}
              onPress={() => router.push("/(tabs)/tasks")}
            >
              <Text style={[styles.heroPillText, { color: "#fff" }]}>
                View Tasks
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recent tasks</Text>
          <Link href="/(tabs)/tasks" style={styles.sectionLink}>
            View all
          </Link>
        </View>

        {recent.map((task) => (
          <Pressable
            key={task.id}
            style={styles.taskCard}
            onPress={() => router.push(`/task/${task.id}`)}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.taskTitle} numberOfLines={1}>
                {task.title}
              </Text>
              <Text style={styles.taskMeta}>
                {taskCode(task.number)} · {task.client.name}
              </Text>
            </View>
            <View
              style={[
                styles.chip,
                { backgroundColor: tint(colors.status[task.status]) },
              ]}
            >
              <Text
                style={[styles.chipText, { color: colors.status[task.status] }]}
              >
                {STATUS_LABEL[task.status]}
              </Text>
            </View>
          </Pressable>
        ))}
        {!tasksQuery.isLoading && recent.length === 0 && (
          <Text style={styles.empty}>No tasks yet — enjoy the calm 🌤️</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  greet: { fontSize: 12, color: colors.muted },
  name: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 18,
    gap: 4,
    marginTop: 4,
  },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  heroBig: { color: "#fff", fontSize: 30, fontWeight: "800" },
  heroSmall: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  heroRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  heroPill: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  heroPillGhost: { backgroundColor: "rgba(23,23,23,0.28)" },
  heroPillText: { color: colors.primary, fontWeight: "700", fontSize: 12 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
  },
  sectionLink: { fontSize: 12, fontWeight: "600", color: colors.primary },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 13,
  },
  taskTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  taskMeta: { fontSize: 11, color: colors.faint },
  chip: {
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  chipText: { fontSize: 10, fontWeight: "700" },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 24,
  },
});
