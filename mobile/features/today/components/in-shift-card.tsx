import * as ImagePicker from 'expo-image-picker';
import { CameraIcon, CheckIcon, WarningIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { Tables } from '@/lib/database.types';
import { cn } from '@/lib/utils';
import { uploadTaskProof } from '../api';
import { useSetTaskDone, useShiftTasks } from '../hooks';

function ElapsedTimer({ since }: { since: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(timer);
  }, []);

  const totalSeconds = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Text className="text-3xl font-semibold tabular-nums text-ink">
      {pad(h)}:{pad(m)}:{pad(s)}
    </Text>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total === 0 ? 0 : done / total;

  return (
    <View className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E7E5E4"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#0F766E"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View className="absolute items-center justify-center">
        <Text className="text-xs font-semibold tabular-nums">
          {done}/{total}
        </Text>
      </View>
    </View>
  );
}

interface TaskRowProps {
  task: Tables<'shift_tasks'>;
  busy: boolean;
  onToggle: (task: Tables<'shift_tasks'>) => void;
}

function TaskRow({ task, busy, onToggle }: TaskRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.done }}
      disabled={busy}
      onPress={() => onToggle(task)}
      className="flex-row items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 active:bg-muted/50">
      <View
        className={cn(
          'size-6 items-center justify-center rounded-lg border',
          task.done ? 'border-success bg-success' : 'border-border bg-background'
        )}>
        {task.done && <CheckIcon size={14} color="#FFFFFF" weight="bold" />}
      </View>
      <Text
        className={cn('flex-1 text-sm', task.done && 'text-muted-foreground line-through')}
        numberOfLines={2}>
        {task.title}
      </Text>
      {task.photo_url ? (
        <Image
          source={{ uri: task.photo_url }}
          className="size-9 rounded-lg bg-muted"
          accessibilityIgnoresInvertColors
        />
      ) : task.requires_photo ? (
        <CameraIcon size={18} weight="duotone" color="#0F766E" />
      ) : null}
    </Pressable>
  );
}

interface InShiftCardProps {
  shift: Tables<'shifts'>;
  site: Tables<'job_sites'>;
  entry: Tables<'time_entries'>;
  onReportIssue: () => void;
}

export function InShiftCard({ shift, site, entry, onReportIssue }: InShiftCardProps) {
  const tasks = useShiftTasks(shift.id, true);
  const setDone = useSetTaskDone(shift.id);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  const taskList = tasks.data ?? [];
  const doneCount = taskList.filter((t) => t.done).length;

  const toggleTask = async (task: Tables<'shift_tasks'>) => {
    setTaskError(null);
    if (task.done) {
      setDone.mutate({ taskId: task.id, done: false });
      return;
    }
    // Photo-proof tasks capture first, then complete with the thumbnail attached.
    if (task.requires_photo && !task.photo_url) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      const result = permission.granted
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            base64: true,
            quality: 0.6,
          });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.base64) return;
      try {
        setUploadingTaskId(task.id);
        const photoUrl = await uploadTaskProof(
          shift.id,
          asset.base64,
          asset.mimeType ?? 'image/jpeg'
        );
        setDone.mutate({ taskId: task.id, done: true, photoUrl });
      } catch {
        setTaskError('Photo upload failed — check your connection and try again.');
      } finally {
        setUploadingTaskId(null);
      }
      return;
    }
    setDone.mutate({ taskId: task.id, done: true });
  };

  return (
    <Card>
      <CardContent className="gap-4 p-4">
        <View className="flex-row items-center justify-between">
          <View className="gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <View className="size-2 rounded-full bg-success" />
              <Text className="text-xs font-medium uppercase tracking-wider text-success">
                On site
              </Text>
            </View>
            <Text className="text-lg font-semibold">{site.name}</Text>
            <ElapsedTimer since={entry.clock_in_at} />
          </View>
          <ProgressRing done={doneCount} total={taskList.length} />
        </View>

        {entry.flags.length > 0 && (
          <View className="flex-row items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
            <WarningIcon size={14} weight="duotone" color="#D97706" />
            <Text className="flex-1 text-xs text-warning">
              This entry is flagged for review ({entry.flags.join(', ').replace(/_/g, ' ')}).
            </Text>
          </View>
        )}

        <View className="gap-1.5">
          <Text className="text-xs font-medium text-muted-foreground">Tasks</Text>
          {tasks.isPending ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
          ) : taskList.length === 0 ? (
            <Text className="text-sm text-muted-foreground">No checklist for this site.</Text>
          ) : (
            taskList.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                busy={setDone.isPending || uploadingTaskId === task.id}
                onToggle={(t) => void toggleTask(t)}
              />
            ))
          )}
          {taskError && <Text className="text-xs text-danger">{taskError}</Text>}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onReportIssue}
          className="items-center rounded-lg border border-border py-2.5 active:bg-muted">
          <Text className="text-sm font-medium text-ink">Report issue</Text>
        </Pressable>
      </CardContent>
    </Card>
  );
}
