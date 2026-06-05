export type TaskStatus = "planned" | "in_progress" | "completed";

export interface PlannerTask {
  id: string;
  title: string;
  status: TaskStatus;
  time?: string;
}

export interface UsageEntry {
  usage: number;
  cost: number;
}

export interface AlertEntry {
  id: string;
  title: string;
  body: string;
  region: string;
  timestamp: string;
  active: boolean;
  source?: string;
}

export interface FirestoreData {
  electricity: Record<string, UsageEntry>;
  water: Record<string, UsageEntry>;
  planner: Record<string, PlannerTask[]>;
  alerts: AlertEntry[];
  settings: {
    electricityPrice: string;
    waterPrice: string;
    notificationsEnabled: boolean;
    autoUpdateEnabled: boolean;
  };
}

export interface FirestoreState {
  data: FirestoreData | null;
  loading: boolean;
  error: string | null;
}
