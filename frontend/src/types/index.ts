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

export interface VocabExampleSentence {
  en: string
  cn: string
}

export interface VocabCard {
  word_id: number
  word: string
  phonetic: string
  part_of_speech: string
  definition_en: string
  definition_cn: string
  example_sentences: VocabExampleSentence[]
  status: string
  repetitions: number
  frequency_rank?: number
  tags?: string[]
}

export type FrequencyTier = 'high' | 'medium' | 'low'

export interface FrequencyTierStats {
  total: number
  mastered: number
  reviewing: number
  learning: number
  new: number
}

export interface VocabStats {
  today: {
    new_words: number
    reviewed_words: number
    accuracy: number
    minutes_studied: number
  }
  all_time: {
    total_words: number
    mastered: number
    reviewing: number
    learning: number
    new: number
  }
  frequency_tiers?: Record<FrequencyTier, FrequencyTierStats>
  streak_days: number
  words_due_today: number
}

export interface VocabSettings {
  daily_new_words: number
  daily_review_limit: number
  auto_pronounce: boolean
  show_cn_definition: boolean
  preferred_accent: 'us' | 'uk'
  sound_effects: boolean
}

export interface QuizOption {
  text: string
  key: string
}

export interface QuizQuestion {
  word_id: number
  prompt: string
  prompt_sub: string
  options: QuizOption[]
  correct_key: string
}

export interface QuizSession {
  quiz_id: string
  mode: string
  questions: QuizQuestion[]
}

export interface QuizResultItem {
  word_id: number
  word: string
  selected: string
  correct_answer: string
  correct_answer_text?: string
  is_correct: boolean
}

export interface QuizResult {
  score: number
  total: number
  results: QuizResultItem[]
}

export interface BookmarkedWord {
  id: number
  word: string
  phonetic: string
  part_of_speech: string
  definition_en: string
  definition_cn: string
  example_sentences: VocabExampleSentence[]
  difficulty: number
  status: string
  bookmarked: boolean
  frequency_rank?: number
  tags?: string[]
}

export interface BookmarkList {
  words: BookmarkedWord[]
  total: number
  page: number
  per_page: number
}

// ── Mastery mode types ──

export interface WordDerivative {
  word: string
  pos: string
  cn: string
}

export interface WordRoot {
  root: string
  meaning: string
  origin: string
}

export interface MasteryOption {
  text: string
  key: string
}

export interface MasteryWord {
  word_id: number
  word: string
  phonetic: string
  phonetic_uk: string
  phonetic_us: string
  syllables: string
  part_of_speech: string
  definition_en: string
  definition_cn: string
  example_sentences: VocabExampleSentence[]
  collocations: string[]
  derivatives: WordDerivative[]
  word_root: WordRoot
  mastery_stage: number
  status: string
  frequency_rank?: number
  tags?: string[]
  stage1_options: MasteryOption[]
  stage1_correct_key: string
  stage2_options: MasteryOption[]
  stage2_correct_key: string
}

export interface MasterySession {
  words: MasteryWord[]
  total: number
}

export interface MasteryAnswerResponse {
  status: string
  mastery_stage: number
  session_mastered: boolean
  progress: {
    status: string
    interval_days: number
    next_review_at: string
    repetitions: number
  }
}

export interface TranslationSentence {
  chinese: string
  english: string
  blanks: { position: string; hint: string }[]
}

export interface TranslationSet {
  sentences: TranslationSentence[]
}
