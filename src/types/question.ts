/**
 * Question model covering both theoretical and practical assessment types.
 *
 * The model is a discriminated union on `type`, which lets the renderer pick
 * the correct editor/viewer component with full type-safety and guarantees
 * that grading logic handles every variant.
 */

import type { Id, IsoDateTime } from './domain';

/** Theory question kinds required by the PRD. */
export const THEORY_QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_SELECT',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
  'FILL_IN_BLANK',
  'MATCHING',
  'ORDERING',
] as const;

/** Practical question kinds. Several are staged for later milestones. */
export const PRACTICAL_QUESTION_TYPES = [
  'WRITE_CODE',
  'COMPLETE_CODE',
  'DEBUG_CODE',
  'PREDICT_OUTPUT',
  'REFACTOR_CODE',
  'SQL',
  'HTML_CSS',
  'REACT',
  'LINUX',
  'GIT',
  'NETWORKING',
  'CYBERSECURITY',
] as const;

export type TheoryQuestionType = (typeof THEORY_QUESTION_TYPES)[number];
export type PracticalQuestionType = (typeof PRACTICAL_QUESTION_TYPES)[number];
export type QuestionType = TheoryQuestionType | PracticalQuestionType;

export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Fields shared by every question variant. */
export interface QuestionBase {
  id: Id;
  /** Owning institution, for question-bank isolation. */
  institutionId: Id;
  authorId: Id;
  /** Markdown-formatted prompt shown to the candidate. */
  prompt: string;
  marks: number;
  difficulty: Difficulty;
  tags: string[];
  /** Course this question is categorised under, if any. */
  courseId?: Id;
  /** Explanation revealed after grading, when the lecturer allows it. */
  explanation?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Choice {
  id: Id;
  /** Markdown-formatted option text. */
  text: string;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'MULTIPLE_CHOICE';
  choices: Choice[];
  /** Exactly one correct choice. Never sent to student clients. */
  correctChoiceId?: Id;
  shuffleChoices: boolean;
}

export interface MultipleSelectQuestion extends QuestionBase {
  type: 'MULTIPLE_SELECT';
  choices: Choice[];
  correctChoiceIds?: Id[];
  shuffleChoices: boolean;
  /** Award marks proportional to correct selections. */
  partialCredit: boolean;
}

export interface TrueFalseQuestion extends QuestionBase {
  type: 'TRUE_FALSE';
  correctAnswer?: boolean;
}

export interface ShortAnswerQuestion extends QuestionBase {
  type: 'SHORT_ANSWER';
  /** Accepted answers; comparison honours the flags below. */
  acceptedAnswers?: string[];
  caseSensitive: boolean;
  /** Trim and collapse internal whitespace before comparing. */
  normaliseWhitespace: boolean;
  maxLength?: number;
}

export interface EssayQuestion extends QuestionBase {
  type: 'ESSAY';
  minWords?: number;
  maxWords?: number;
  /** Rubric criteria used by human graders (and future AI-assisted grading). */
  rubric?: RubricCriterion[];
}

export interface RubricCriterion {
  id: Id;
  label: string;
  description?: string;
  maxMarks: number;
}

export interface FillInBlankQuestion extends QuestionBase {
  type: 'FILL_IN_BLANK';
  /** Prompt uses `{{1}}`, `{{2}}` … placeholders matched to `blanks`. */
  blanks: Array<{
    index: number;
    acceptedAnswers?: string[];
    caseSensitive: boolean;
  }>;
}

export interface MatchingQuestion extends QuestionBase {
  type: 'MATCHING';
  left: Choice[];
  right: Choice[];
  /** Correct pairings as `[leftId, rightId]`. */
  correctPairs?: Array<[Id, Id]>;
  partialCredit: boolean;
}

export interface OrderingQuestion extends QuestionBase {
  type: 'ORDERING';
  items: Choice[];
  /** Item ids in their correct order. */
  correctOrder?: Id[];
  partialCredit: boolean;
}

export type TheoryQuestion =
  | MultipleChoiceQuestion
  | MultipleSelectQuestion
  | TrueFalseQuestion
  | ShortAnswerQuestion
  | EssayQuestion
  | FillInBlankQuestion
  | MatchingQuestion
  | OrderingQuestion;

/** Programming languages offered by the execution engine. */
export const LANGUAGES = [
  'C',
  'CPP',
  'JAVA',
  'PYTHON',
  'JAVASCRIPT',
  'TYPESCRIPT',
  'CSHARP',
  'GO',
  'RUST',
  'PHP',
  'SQL',
  'BASH',
] as const;

export type Language = (typeof LANGUAGES)[number];

/** Languages named in the PRD as future additions. */
export const PLANNED_LANGUAGES = ['KOTLIN', 'SWIFT', 'DART'] as const;

export interface TestCase {
  id: Id;
  name?: string;
  stdin: string;
  expectedStdout: string;
  /** Public tests are shown to candidates; hidden tests are lecturer-only. */
  visibility: 'PUBLIC' | 'HIDDEN';
  /** Marks awarded when this case passes. */
  weight: number;
  /** Per-case override of the question execution limits. */
  timeLimitMs?: number;
}

/** Sandbox limits applied by the execution engine (Judge0/Piston). */
export interface ExecutionLimits {
  timeLimitMs: number;
  memoryLimitMb: number;
  /** Wall-clock ceiling covering compilation plus every test case. */
  totalTimeLimitMs: number;
  /** Whether the sandbox may reach the network (needed for some CTF tasks). */
  allowNetwork: boolean;
}

export const DEFAULT_EXECUTION_LIMITS: ExecutionLimits = {
  timeLimitMs: 2000,
  memoryLimitMb: 256,
  totalTimeLimitMs: 30_000,
  allowNetwork: false,
};

/** Editor affordances a lecturer can toggle per question. */
export interface EditorSettings {
  autocomplete: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  bracketMatching: boolean;
  /** Blocks paste into the editor when disabled. */
  allowPaste: boolean;
  wordWrap: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  autocomplete: false,
  minimap: true,
  lineNumbers: true,
  bracketMatching: true,
  allowPaste: false,
  wordWrap: false,
};

/** Shared shape for every question that presents a code editor. */
export interface CodeQuestionBase extends QuestionBase {
  /** Languages the candidate may choose from. */
  allowedLanguages: Language[];
  /** Pre-filled editor content, keyed by language. */
  starterCode: Partial<Record<Language, string>>;
  testCases: TestCase[];
  limits: ExecutionLimits;
  editorSettings: EditorSettings;
  /** Reference solution, lecturer-only. */
  referenceSolution?: Partial<Record<Language, string>>;
}

export interface WriteCodeQuestion extends CodeQuestionBase {
  type: 'WRITE_CODE';
}

export interface CompleteCodeQuestion extends CodeQuestionBase {
  type: 'COMPLETE_CODE';
  /** Line ranges the candidate may not modify, as `[startLine, endLine]`. */
  readOnlyRanges?: Array<[number, number]>;
}

export interface DebugCodeQuestion extends CodeQuestionBase {
  type: 'DEBUG_CODE';
  /** Buggy source the candidate must repair, keyed by language. */
  brokenCode: Partial<Record<Language, string>>;
  /** Optional hint describing the failure symptom. */
  symptom?: string;
}

export interface RefactorCodeQuestion extends CodeQuestionBase {
  type: 'REFACTOR_CODE';
  originalCode: Partial<Record<Language, string>>;
  /** Human-readable goals, e.g. "remove duplication", "O(n log n)". */
  objectives: string[];
}

export interface PredictOutputQuestion extends QuestionBase {
  type: 'PREDICT_OUTPUT';
  language: Language;
  /** Snippet shown read-only; the candidate types the expected output. */
  snippet: string;
  expectedOutput?: string;
  caseSensitive: boolean;
}

export interface SqlQuestion extends QuestionBase {
  type: 'SQL';
  /** Identifier of the seeded database the query runs against. */
  datasetId: Id;
  /** Schema preview rendered next to the editor. */
  schemaPreview?: string;
  /** Expected result set, compared row-wise. */
  expectedResult?: { columns: string[]; rows: unknown[][] };
  /** Whether row ordering matters during comparison. */
  orderSensitive: boolean;
  limits: ExecutionLimits;
  editorSettings: EditorSettings;
}

export interface HtmlCssQuestion extends QuestionBase {
  type: 'HTML_CSS';
  starterFiles: Record<string, string>;
  /** DOM assertions evaluated against the rendered preview. */
  domAssertions?: Array<{ selector: string; expectation: string }>;
  editorSettings: EditorSettings;
}

export interface ReactQuestion extends QuestionBase {
  type: 'REACT';
  /** Virtual project the candidate edits, as a path → contents map. */
  starterFiles: Record<string, string>;
  entryFile: string;
  testFiles?: Record<string, string>;
  limits: ExecutionLimits;
  editorSettings: EditorSettings;
}

export interface LinuxQuestion extends QuestionBase {
  type: 'LINUX';
  /** Container image providing the interactive shell. */
  image: string;
  setupScript?: string;
  /** Assertions run against the container after the candidate finishes. */
  verificationScript?: string;
  limits: ExecutionLimits;
}

export interface GitQuestion extends QuestionBase {
  type: 'GIT';
  /** Script that builds the starting repository state. */
  repoSetupScript: string;
  /** Expected end state, e.g. branch topology or commit message patterns. */
  verificationScript?: string;
  limits: ExecutionLimits;
}

export interface NetworkingQuestion extends QuestionBase {
  type: 'NETWORKING';
  /** Topology definition consumed by the network simulator. */
  topology: string;
  objectives: string[];
  limits: ExecutionLimits;
}

export interface CybersecurityQuestion extends QuestionBase {
  type: 'CYBERSECURITY';
  /** Container or URL hosting the challenge. */
  challengeImage: string;
  /** Hash of the expected flag; never ship the plaintext to clients. */
  flagHash?: string;
  hints?: string[];
  limits: ExecutionLimits;
}

export type PracticalQuestion =
  | WriteCodeQuestion
  | CompleteCodeQuestion
  | DebugCodeQuestion
  | RefactorCodeQuestion
  | PredictOutputQuestion
  | SqlQuestion
  | HtmlCssQuestion
  | ReactQuestion
  | LinuxQuestion
  | GitQuestion
  | NetworkingQuestion
  | CybersecurityQuestion;

export type Question = TheoryQuestion | PracticalQuestion;

const THEORY_SET = new Set<string>(THEORY_QUESTION_TYPES);

/** Narrows a question to the theory family. */
export function isTheoryQuestion(question: Question): question is TheoryQuestion {
  return THEORY_SET.has(question.type);
}

/** Narrows a question to the practical family. */
export function isPracticalQuestion(
  question: Question,
): question is PracticalQuestion {
  return !THEORY_SET.has(question.type);
}

/** True when the variant presents a Monaco editor with runnable tests. */
export function isCodeQuestion(
  question: Question,
): question is
  | WriteCodeQuestion
  | CompleteCodeQuestion
  | DebugCodeQuestion
  | RefactorCodeQuestion {
  return (
    question.type === 'WRITE_CODE' ||
    question.type === 'COMPLETE_CODE' ||
    question.type === 'DEBUG_CODE' ||
    question.type === 'REFACTOR_CODE'
  );
}

/** Human-readable labels for question types, for menus and summaries. */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTIPLE_SELECT: 'Multiple Select',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer',
  ESSAY: 'Essay',
  FILL_IN_BLANK: 'Fill in the Blank',
  MATCHING: 'Matching',
  ORDERING: 'Ordering',
  WRITE_CODE: 'Write Code',
  COMPLETE_CODE: 'Complete Code',
  DEBUG_CODE: 'Debug Code',
  PREDICT_OUTPUT: 'Predict Output',
  REFACTOR_CODE: 'Refactor Code',
  SQL: 'SQL Query',
  HTML_CSS: 'HTML / CSS',
  REACT: 'React Project',
  LINUX: 'Linux Terminal',
  GIT: 'Git Repository',
  NETWORKING: 'Networking',
  CYBERSECURITY: 'Capture the Flag',
};

/** Monaco language identifiers for each supported language. */
export const MONACO_LANGUAGE_IDS: Record<Language, string> = {
  C: 'c',
  CPP: 'cpp',
  JAVA: 'java',
  PYTHON: 'python',
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
  CSHARP: 'csharp',
  GO: 'go',
  RUST: 'rust',
  PHP: 'php',
  SQL: 'sql',
  BASH: 'shell',
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  C: 'C',
  CPP: 'C++',
  JAVA: 'Java',
  PYTHON: 'Python',
  JAVASCRIPT: 'JavaScript',
  TYPESCRIPT: 'TypeScript',
  CSHARP: 'C#',
  GO: 'Go',
  RUST: 'Rust',
  PHP: 'PHP',
  SQL: 'SQL',
  BASH: 'Bash',
};
