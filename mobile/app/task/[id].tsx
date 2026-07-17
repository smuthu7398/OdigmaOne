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
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  api,
  initials,
  relativeTime,
  taskCode,
  type TaskItem,
} from "../../lib/api";
import {
  colors,
  radius,
  STATUS_LABEL,
  PRIORITY_LABEL,
  tint,
} from "../../lib/theme";

type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
};

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const taskQuery = useQuery({
    queryKey: ["task", id],
    queryFn: () => api<TaskItem>(`/api/v1/tasks/${id}`),
  });
  const commentsQuery = useQuery({
    queryKey: ["comments", id],
    queryFn: () => api<CommentItem[]>(`/api/v1/tasks/${id}/comments`),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api(`/api/v1/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      api(`/api/v1/tasks/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: comment.trim() }),
      }),
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
    },
  });

  const task = taskQuery.data?.data;
  const comments = commentsQuery.data?.data ?? [];

  if (taskQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (!task) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={{ color: colors.muted }}>Task not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headRow}>
            <Pressable onPress={() => router.back()} style={styles.back}>
              <Ionicons name="arrow-back" size={18} color={colors.foreground} />
            </Pressable>
            <Text style={styles.code}>
              {task.type === "BUG" ? "🐞 " : ""}
              {taskCode(task.number)} · {task.client.name}
            </Text>
          </View>

          <Text style={styles.title}>{task.title}</Text>

          <View style={styles.statusRow}>
            {STATUSES.map((s) => {
              const active = task.status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => !active && statusMutation.mutate(s)}
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: active
                        ? colors.status[s]
                        : tint(colors.status[s], 0.12),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: active ? "#fff" : colors.status[s] },
                    ]}
                  >
                    {STATUS_LABEL[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.card}>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Priority</Text>
                <Text
                  style={[
                    styles.metaValue,
                    { color: colors.priority[task.priority] },
                  ]}
                >
                  {PRIORITY_LABEL[task.priority]}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Due</Text>
                <Text style={styles.metaValue}>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })
                    : "—"}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>
                  Assignee{task.assignees.length > 1 ? "s" : ""}
                </Text>
                <Text style={styles.metaValue}>
                  {task.assignees.length > 0
                    ? task.assignees
                        .map((a) => a.user.name.split(" ")[0])
                        .join(", ")
                    : "—"}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Progress</Text>
                <Text style={styles.metaValue}>{task.progress}%</Text>
              </View>
            </View>
            {task.description && (
              <Text style={styles.description}>{task.description}</Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>
            Comments ({comments.length})
          </Text>
          {comments.map((c) => (
            <View key={c.id} style={styles.commentCard}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>
                  {initials(c.author.name)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.commentAuthor}>
                  {c.author.name}{" "}
                  <Text style={styles.commentTime}>
                    {relativeTime(c.createdAt)}
                  </Text>
                </Text>
                <Text style={styles.commentBody}>{c.body}</Text>
              </View>
            </View>
          ))}

          <View style={styles.commentForm}>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Write a comment…"
              placeholderTextColor={colors.faint}
              multiline
            />
            <Pressable
              style={[
                styles.commentSend,
                (!comment.trim() || commentMutation.isPending) && {
                  opacity: 0.4,
                },
              ]}
              disabled={!comment.trim() || commentMutation.isPending}
              onPress={() => commentMutation.mutate()}
            >
              {commentMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={15} color="#fff" />
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  back: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  code: { fontSize: 12, color: colors.faint, fontWeight: "600" },
  title: { fontSize: 19, fontWeight: "700", color: colors.foreground },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusChip: {
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusChipText: { fontSize: 11, fontWeight: "700" },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 12,
  },
  metaRow: { flexDirection: "row" },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.faint,
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  description: { fontSize: 13, color: colors.foreground, lineHeight: 19 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 4,
  },
  commentCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 12,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: { color: colors.primary, fontWeight: "700", fontSize: 10 },
  commentAuthor: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  commentTime: { fontSize: 11, color: colors.faint, fontWeight: "400" },
  commentBody: { fontSize: 13, color: colors.foreground, lineHeight: 18 },
  commentForm: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.foreground,
    maxHeight: 100,
  },
  commentSend: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
