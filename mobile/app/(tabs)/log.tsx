import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, initials, taskCode, todayIST } from "../../lib/api";
import { colors, radius, tint } from "../../lib/theme";

type WorkLogItem = {
  id: string;
  description: string;
  hours: string;
  user: { id: string; name: string };
  task: { id: string; number: number; title: string } | null;
  client: { id: string; name: string } | null;
};

type TaskOption = { id: string; number: number; title: string };

export default function LogScreen() {
  const queryClient = useQueryClient();
  const today = todayIST();
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);

  const logsQuery = useQuery({
    queryKey: ["work-logs", today],
    queryFn: () =>
      api<{ items: WorkLogItem[]; totalHours: number }>(
        `/api/v1/work-logs?date=${today}&pageSize=100`
      ),
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", "log-options"],
    queryFn: () =>
      api<TaskOption[]>("/api/v1/tasks?pageSize=10&sort=-createdAt"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api("/api/v1/work-logs", {
        method: "POST",
        body: JSON.stringify({
          workDate: today,
          description: description.trim(),
          hours: Number(hours),
          ...(taskId ? { taskId } : {}),
        }),
      }),
    onSuccess: () => {
      setDescription("");
      setHours("");
      setTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
    },
  });

  const logs = logsQuery.data?.data.items ?? [];
  const total = logsQuery.data?.data.totalHours ?? 0;
  const canSubmit =
    description.trim().length > 0 && Number(hours) >= 0.25 && Number(hours) <= 24;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headRow}>
            <Text style={styles.title}>Work Log</Text>
            <View style={styles.totalPill}>
              <Text style={styles.totalText}>{total}h today</Text>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>What did you work on today?</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Finalized the launch-offer banner and shared for review"
              placeholderTextColor={colors.faint}
              multiline
            />
            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, { width: 100 }]}
                value={hours}
                onChangeText={setHours}
                placeholder="Hours"
                placeholderTextColor={colors.faint}
                keyboardType="decimal-pad"
              />
              <Pressable
                style={[styles.submit, !canSubmit && { opacity: 0.4 }]}
                disabled={!canSubmit || createMutation.isPending}
                onPress={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitText}>Log it</Text>
                )}
              </Pressable>
            </View>
            {createMutation.isError && (
              <Text style={styles.error}>
                {(createMutation.error as Error).message}
              </Text>
            )}

            <Text style={styles.linkLabel}>Link a task (optional)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {(tasksQuery.data?.data ?? []).map((t) => {
                const active = taskId === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTaskId(active ? null : t.id)}
                    style={[
                      styles.taskChip,
                      active && {
                        backgroundColor: colors.primarySoft,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.taskChipText,
                        active && { color: colors.primary },
                      ]}
                    >
                      {taskCode(t.number)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Text style={styles.sectionTitle}>Today&apos;s entries</Text>
          {logs.length === 0 && !logsQuery.isLoading && (
            <Text style={styles.empty}>
              Nothing logged yet — what did you work on?
            </Text>
          )}
          {logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logAvatar}>
                <Text style={styles.logAvatarText}>
                  {initials(log.user.name)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.logUser}>
                  {log.user.name}
                  {log.client && (
                    <Text style={styles.logMeta}> · {log.client.name}</Text>
                  )}
                  {log.task && (
                    <Text style={styles.logMeta}>
                      {" "}
                      · {taskCode(log.task.number)}
                    </Text>
                  )}
                </Text>
                <Text style={styles.logDescription}>{log.description}</Text>
              </View>
              <View
                style={[styles.hoursPill, { backgroundColor: colors.raised }]}
              >
                <Text style={styles.hoursText}>{Number(log.hours)}h</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  headRow: { flexDirection: "row", alignItems: "center" },
  title: { flex: 1, fontSize: 22, fontWeight: "700", color: colors.foreground },
  totalPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  totalText: { color: colors.primary, fontWeight: "700", fontSize: 12 },
  form: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
  },
  formTitle: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.card,
  },
  textarea: { minHeight: 64, textAlignVertical: "top" },
  formRow: { flexDirection: "row", gap: 8 },
  submit: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  error: { color: colors.destructive, fontSize: 12 },
  linkLabel: { fontSize: 11, fontWeight: "600", color: colors.muted },
  taskChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  taskChipText: { fontSize: 11, fontWeight: "700", color: colors.muted },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 4,
  },
  empty: { color: colors.muted, fontSize: 13 },
  logCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 12,
  },
  logAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  logAvatarText: { color: colors.primary, fontWeight: "700", fontSize: 10 },
  logUser: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  logMeta: { fontSize: 11, color: colors.faint, fontWeight: "400" },
  logDescription: { fontSize: 13, color: colors.foreground, lineHeight: 18 },
  hoursPill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  hoursText: { fontSize: 11, fontWeight: "700", color: colors.foreground },
});
