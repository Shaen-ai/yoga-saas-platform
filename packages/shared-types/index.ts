export interface User {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'instructor' | 'admin' | 'super_admin';
  tenantId: string;
  wixUserId?: string;
  profile?: UserProfile;
  progress?: UserProgress;
  preferences?: UserPreferences;
  subscription?: UserSubscription;
}

export interface UserProfile {
  age?: number;
  height?: number;
  weight?: number;
  fitness_level?: string;
  medical_conditions?: string[];
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface UserProgress {
  sessions_completed: number;
  total_minutes: number;
  current_streak: number;
  longest_streak: number;
  last_session_date?: Date;
  favorite_poses?: string[];
  achievements?: Achievement[];
}

export interface Achievement {
  name: string;
  earned_date: Date;
  description: string;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    reminder_time?: string;
  };
  privacy: {
    share_progress: boolean;
    public_profile: boolean;
  };
}

export interface UserSubscription {
  plan: string;
  status: string;
  started_at: Date;
  expires_at: Date;
  stripe_customer_id?: string;
}

export interface UserAssessment {
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  primary_goals: string[];
  injuries_limitations: Injury[];
  preferred_styles: string[];
  session_duration: number;
  sessions_per_week: number;
  additional_notes?: string;
}

export interface Injury {
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

export interface YogaPose {
  name: string;
  sanskrit_name?: string;
  duration_seconds?: number;
  duration_breaths?: number;
  instructions: string[];
  modifications: string[];
  contraindications: string[];
  benefits: string[];
  image_url?: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
}

export interface YogaSession {
  session_number: number;
  duration_minutes: number;
  warm_up: {
    duration_minutes: number;
    poses: YogaPose[];
  };
  main_sequence: {
    duration_minutes: number;
    poses: YogaPose[];
  };
  cool_down: {
    duration_minutes: number;
    poses: YogaPose[];
  };
  meditation?: {
    duration_minutes: number;
    type: string;
    instructions: string;
  };
}

export interface YogaWeek {
  week_number: number;
  theme: string;
  focus_areas: string[];
  sessions: YogaSession[];
}

export interface YogaPlan {
  _id: string;
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  planStructure: {
    duration_weeks: number;
    sessions_per_week: number;
    difficulty_level: 'beginner' | 'intermediate' | 'advanced';
    total_sessions: number;
    weeks: YogaWeek[];
  };
  userAssessment: UserAssessment;
  aiMetadata: {
    model_used: string;
    confidence_score: number;
    generation_time_ms: number;
    tokens_consumed: number;
    prompt_version: string;
    safety_checks_passed: boolean;
  };
  approvalWorkflow: {
    status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
    reviewed_by?: string;
    review_notes?: string;
    approved_at?: Date;
    revision_requests?: RevisionRequest[];
  };
  usage: {
    sessions_completed: number;
    total_practice_time: number;
    last_session_date?: Date;
    completion_rate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RevisionRequest {
  requested_by: string;
  requested_at: Date;
  reason: string;
  changes_requested: string;
}

export interface AuthState {
  user: User | null;
  tenant: string | null;
  wixInstance: WixInstance | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface WixInstance {
  instanceId: string;
  siteId: string;
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
  permissions?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Wix Widget Props
export interface WidgetProps {
  wixInstanceId?: string;
  userId?: string;
  tenantId?: string;
  apiEndpoint?: string;
}

// API Client Types
export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
}

export interface WixLoginData {
  wixUserId: string;
  wixInstanceId: string;
  siteId: string;
  name?: string;
  email?: string;
}

export interface GeneratePlanRequest {
  userId: string;
  tenantId: string;
  assessment: UserAssessment;
  wixContext?: {
    instanceId: string;
  };
}

// Dashboard Analytics Types
export interface DashboardStats {
  total_members: number;
  active_plans: number;
  completed_sessions: number;
  pending_reviews: number;
  monthly_growth: number;
}

export interface ProgressChart {
  date: string;
  sessions: number;
  minutes: number;
}

// Environment Configuration
export interface EnvironmentConfig {
  api_url: string;
  wix_app_id: string;
  stripe_public_key?: string;
  sentry_dsn?: string;
  analytics_id?: string;
}