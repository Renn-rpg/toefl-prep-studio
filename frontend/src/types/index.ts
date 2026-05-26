export interface StudyPlanMeta {
  current_level: string
  target_score: number
  exam_date: string
  weekly_hours: number
}

export interface PlanWeek {
  week: number
  focus: string
  daily_tasks: { day: string; tasks: string[] }[]
  weekly_goal: string
}

export interface StudyPlan {
  id: number
  plan: { weeks: PlanWeek[]; total_weeks: number; study_tips: string[] }
  meta: StudyPlanMeta
}

export interface ListeningPassage {
  id: number
  title: string
  difficulty: string
  passage_type: string
  audio_url: string
}

export interface Question {
  id: number
  question: string
  options: string[]
  answer: string
  explanation?: string
}

export interface ListeningPassageDetail extends ListeningPassage {
  transcript: string
  questions: Question[]
}

export interface SpeakingPrompt {
  id: number
  task_type: string
  prompt: string
}

export interface SpeakingFeedback {
  band_descriptor: string
  strengths: string[]
  improvements: string[]
}

export interface SpeakingResult {
  session_id: number
  pronunciation_score: number
  fluency_score: number
  content_score: number
  total_score: number
  feedback_json: string
}

export interface VocabHighlight {
  word: string
  definition: string
}

export interface ReadingPassage {
  id: number
  title: string
  difficulty: string
}

export interface ReadingPassageDetail extends ReadingPassage {
  content: string
  questions: Question[]
  vocab_highlights: VocabHighlight[]
}

export interface WritingPrompt {
  id: number
  task_type: string
  prompt: string
}

export interface WritingFeedback {
  band_descriptor: string
  strengths: string[]
  suggestions: string[]
  corrected_excerpt: string
}

export interface WritingResult {
  session_id: number
  task_achievement_score: number
  coherence_score: number
  language_score: number
  total_score: number
  feedback_json: string
}

export interface MockTestResult {
  id: number
  status: string
  reading_score: number | null
  listening_score: number | null
  speaking_score: number | null
  writing_score: number | null
  total_score: number | null
  created_at: string
}

export interface StageEval {
  id: number
  stage_type: string
  week_number: number | null
  reading_score: number
  listening_score: number
  speaking_score: number
  writing_score: number
  total_score: number
  notes: string | null
  created_at: string
}

export interface DashboardData {
  streak_days: number
  total_minutes: number
  section_averages: { listening: number; reading: number; speaking: number; writing: number }
  radar: { reading: number; listening: number; speaking: number; writing: number }
  heatmap: { date: string; minutes: number }[]
}
