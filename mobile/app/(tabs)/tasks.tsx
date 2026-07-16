import { useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, taskCode, todayIST, type TaskItem } from "../../lib/api";
import {
  colors,
  radius,
  STATUS_LABEL,
  PRIORITY_LABEL,
  tint,
} from "../../lib/theme";

const FILTERS = ["ALL", "TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"];

export default function TasksScreen() {
  const [filter, setFilter] = useState("ALL");

  const query = useQuery({
    queryKey: ["tasks", "list", filter],
    queryFn: () =>
      api<TaskItem[]>(
        "/api/v1/tasks?pageSize=100&sort=-createdAt" +
          (filter !== "ALL" ? `&status=${filter}` : "")
      ),
  });

  const tasks = query.data?.data ?? [];
  const today = todayIST();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Text style={styles.title}>Tasks</Text>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterChip,
                  active && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && { color: colors.primaryForeground },
                  ]}
                >
                  {f === "ALL" ? "All" : STATUS_LABEL[f]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        refreshing={query.isRefetching}
        onRefresh={() => query.refetch()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.isLoading ? null : (
            <Text style={styles.empty}>No tasks match this filter.</Text>
          )
        }
        renderItem={({ item: task }) => {
          const overdue =
            task.dueDate &&
            task.status !== "DONE" &&
            task.dueDate.slice(0, 10) < today;
          const dueToday =
            task.dueDate &&
            task.status !== "DONE" &&
            task.dueDate.slice(0, 10) === today;
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/task/${task.id}`)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.code}>
                  {task.type === "BUG" ? "🐞 " : ""}
                  {taskCode(task.number)}
                </Text>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: tint(colors.priority[task.priority]) },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: colors.priority[task.priority] },
                    ]}
                  >
                    {PRIORITY_LABEL[task.priority]}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{task.title}</Text>
              <View style={styles.cardBottom}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: tint(colors.status[task.status]) },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: colors.status[task.status] },
                    ]}
                  >
                    {STATUS_LABEL[task.status]}
                  </Text>
                </View>
                <Text style={styles.client} numberOfLines={1}>
                  {task.client.name}
                </Text>
                {task.dueDate && (
                  <Text
                    style={[
                      styles.due,
                      overdue && { color: colors.destructive, fontWeight: "700" },
                      dueToday && { color: colors.priority.HIGH, fontWeight: "700" },
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={11} />{" "}
                    {dueToday
                      ? "Today"
                      : new Date(task.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.foreground,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  filters: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  code: { flex: 1, fontSize: 11, color: colors.faint, fontWeight: "600" },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  chip: {
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  chipText: { fontSize: 10, fontWeight: "700" },
  client: { flex: 1, fontSize: 11, color: colors.faint },
  due: { fontSize: 11, color: colors.muted },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 32,
  },
});
