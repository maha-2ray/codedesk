/**
 * Deterministic seed data for the mock backend.
 *
 * Values are hand-written rather than randomly generated so screenshots,
 * demos and tests stay stable between runs.
 */

import type { Course, Institution, User } from '../../types/domain';
import type { Exam } from '../../types/exam';
import type { Question } from '../../types/question';
import {
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_EXECUTION_LIMITS,
} from '../../types/question';
import {
  DEFAULT_GRADING_POLICY,
  DEFAULT_SECURITY_POLICY,
} from '../../types/exam';

const NOW = '2026-07-27T08:00:00Z';

export const institution: Institution = {
  id: 'inst-utg',
  name: 'University of The Gambia',
  code: 'UTG',
  timezone: 'Africa/Banjul',
};

export const users: User[] = [
  {
    id: 'user-student-1',
    institutionId: institution.id,
    role: 'STUDENT',
    email: 'fatou.jallow@student.utg.edu.gm',
    firstName: 'Fatou',
    lastName: 'Jallow',
    identifier: '2021/CS/0142',
    departmentId: 'dept-cs',
    twoFactorEnabled: false,
    createdAt: NOW,
  },
  {
    id: 'user-lecturer-1',
    institutionId: institution.id,
    role: 'LECTURER',
    email: 'm.touray@utg.edu.gm',
    firstName: 'Muhammed',
    lastName: 'Touray',
    identifier: 'STAFF/CS/018',
    departmentId: 'dept-cs',
    twoFactorEnabled: true,
    createdAt: NOW,
  },
  {
    id: 'user-invigilator-1',
    institutionId: institution.id,
    role: 'INVIGILATOR',
    email: 'a.ceesay@utg.edu.gm',
    firstName: 'Awa',
    lastName: 'Ceesay',
    identifier: 'STAFF/EX/004',
    twoFactorEnabled: false,
    createdAt: NOW,
  },
  {
    id: 'user-admin-1',
    institutionId: institution.id,
    role: 'ADMIN',
    email: 'registry@utg.edu.gm',
    firstName: 'Lamin',
    lastName: 'Sanneh',
    identifier: 'STAFF/REG/001',
    twoFactorEnabled: true,
    createdAt: NOW,
  },
];

/** Demo password accepted for every seeded account. */
export const DEMO_PASSWORD = 'codedesk';

export const courses: Course[] = [
  {
    id: 'course-cs201',
    departmentId: 'dept-cs',
    code: 'CS201',
    title: 'Data Structures and Algorithms',
    level: 200,
    creditHours: 3,
    lecturerIds: ['user-lecturer-1'],
  },
  {
    id: 'course-cs305',
    departmentId: 'dept-cs',
    code: 'CS305',
    title: 'Database Systems',
    level: 300,
    creditHours: 3,
    lecturerIds: ['user-lecturer-1'],
  },
  {
    id: 'course-se210',
    departmentId: 'dept-cs',
    code: 'SE210',
    title: 'Software Engineering Principles',
    level: 200,
    creditHours: 4,
    lecturerIds: ['user-lecturer-1'],
  },
];

const questionDefaults = {
  institutionId: institution.id,
  authorId: 'user-lecturer-1',
  tags: [] as string[],
  createdAt: NOW,
  updatedAt: NOW,
};

export const questions: Question[] = [
  {
    ...questionDefaults,
    id: 'q-mcq-1',
    type: 'MULTIPLE_CHOICE',
    courseId: 'course-cs201',
    prompt:
      'What is the average-case time complexity of searching a balanced binary search tree containing *n* nodes?',
    marks: 2,
    difficulty: 'EASY',
    tags: ['complexity', 'trees'],
    shuffleChoices: true,
    choices: [
      { id: 'c1', text: 'O(1)' },
      { id: 'c2', text: 'O(log n)' },
      { id: 'c3', text: 'O(n)' },
      { id: 'c4', text: 'O(n log n)' },
    ],
    correctChoiceId: 'c2',
    explanation:
      'A balanced BST halves the search space at each step, giving logarithmic height.',
  },
  {
    ...questionDefaults,
    id: 'q-msq-1',
    type: 'MULTIPLE_SELECT',
    courseId: 'course-cs201',
    prompt: 'Which of the following sorting algorithms are **stable**?',
    marks: 3,
    difficulty: 'MEDIUM',
    tags: ['sorting'],
    shuffleChoices: true,
    partialCredit: true,
    choices: [
      { id: 's1', text: 'Merge sort' },
      { id: 's2', text: 'Quicksort (Lomuto partition)' },
      { id: 's3', text: 'Insertion sort' },
      { id: 's4', text: 'Heapsort' },
    ],
    correctChoiceIds: ['s1', 's3'],
  },
  {
    ...questionDefaults,
    id: 'q-tf-1',
    type: 'TRUE_FALSE',
    courseId: 'course-cs201',
    prompt: 'A hash table guarantees O(1) worst-case lookup time.',
    marks: 1,
    difficulty: 'EASY',
    tags: ['hashing'],
    correctAnswer: false,
    explanation:
      'Collisions can degrade lookups to O(n) in the worst case, e.g. when every key hashes to one bucket.',
  },
  {
    ...questionDefaults,
    id: 'q-short-1',
    type: 'SHORT_ANSWER',
    courseId: 'course-cs201',
    prompt:
      'Name the traversal that visits a binary search tree’s nodes in ascending key order.',
    marks: 2,
    difficulty: 'EASY',
    tags: ['trees', 'traversal'],
    acceptedAnswers: ['in-order', 'inorder', 'in order'],
    caseSensitive: false,
    normaliseWhitespace: true,
    maxLength: 60,
  },
  {
    ...questionDefaults,
    id: 'q-essay-1',
    type: 'ESSAY',
    courseId: 'course-se210',
    prompt:
      'Compare **monolithic** and **microservice** architectures. Discuss at least three trade-offs and state which you would choose for a university examination platform, justifying your answer.',
    marks: 10,
    difficulty: 'HARD',
    tags: ['architecture'],
    minWords: 200,
    maxWords: 600,
    rubric: [
      { id: 'r1', label: 'Identifies relevant trade-offs', maxMarks: 4 },
      { id: 'r2', label: 'Depth of justification', maxMarks: 4 },
      { id: 'r3', label: 'Clarity and structure', maxMarks: 2 },
    ],
  },
  {
    ...questionDefaults,
    id: 'q-code-1',
    type: 'WRITE_CODE',
    courseId: 'course-cs201',
    prompt:
      'Write a function `two_sum(nums, target)` that returns the **indices** of the two numbers in `nums` adding up to `target`.\n\nAssume exactly one solution exists and the same element may not be used twice. Print the two indices separated by a space.\n\n**Input**: the first line contains the array as space-separated integers; the second line contains the target.',
    marks: 15,
    difficulty: 'MEDIUM',
    tags: ['arrays', 'hashing'],
    allowedLanguages: ['PYTHON', 'JAVASCRIPT', 'JAVA', 'CPP'],
    starterCode: {
      PYTHON:
        'def two_sum(nums, target):\n    # TODO: implement\n    pass\n\n\nif __name__ == "__main__":\n    nums = list(map(int, input().split()))\n    target = int(input())\n    a, b = two_sum(nums, target)\n    print(a, b)\n',
      JAVASCRIPT:
        'function twoSum(nums, target) {\n  // TODO: implement\n}\n\nconst lines = require("fs").readFileSync(0, "utf8").split("\\n");\nconst nums = lines[0].trim().split(/\\s+/).map(Number);\nconst target = Number(lines[1]);\nconst [a, b] = twoSum(nums, target);\nconsole.log(a, b);\n',
    },
    testCases: [
      {
        id: 't1',
        name: 'Example case',
        stdin: '2 7 11 15\n9',
        expectedStdout: '0 1',
        visibility: 'PUBLIC',
        weight: 5,
      },
      {
        id: 't2',
        name: 'Negative numbers',
        stdin: '-3 4 3 90\n0',
        expectedStdout: '0 2',
        visibility: 'PUBLIC',
        weight: 5,
      },
      {
        id: 't3',
        name: 'Large input',
        stdin: '1 5 9 12 20 33\n45',
        expectedStdout: '3 4',
        visibility: 'HIDDEN',
        weight: 5,
      },
    ],
    limits: DEFAULT_EXECUTION_LIMITS,
    editorSettings: DEFAULT_EDITOR_SETTINGS,
  },
  {
    ...questionDefaults,
    id: 'q-debug-1',
    type: 'DEBUG_CODE',
    courseId: 'course-cs201',
    prompt:
      'The function below should return the factorial of `n`, but it fails for every input. Find and fix the defect.',
    marks: 8,
    difficulty: 'EASY',
    tags: ['recursion', 'debugging'],
    symptom: 'Raises RecursionError for all inputs.',
    allowedLanguages: ['PYTHON'],
    starterCode: {},
    brokenCode: {
      PYTHON:
        'def factorial(n):\n    # The base case is wrong.\n    if n == -1:\n        return 1\n    return n * factorial(n - 1)\n\n\nif __name__ == "__main__":\n    print(factorial(int(input())))\n',
    },
    testCases: [
      {
        id: 'd1',
        name: 'factorial(5)',
        stdin: '5',
        expectedStdout: '120',
        visibility: 'PUBLIC',
        weight: 4,
      },
      {
        id: 'd2',
        name: 'factorial(0)',
        stdin: '0',
        expectedStdout: '1',
        visibility: 'HIDDEN',
        weight: 4,
      },
    ],
    limits: DEFAULT_EXECUTION_LIMITS,
    editorSettings: DEFAULT_EDITOR_SETTINGS,
  },
  {
    ...questionDefaults,
    id: 'q-sql-1',
    type: 'SQL',
    courseId: 'course-cs305',
    prompt:
      'Using the `students` and `enrolments` tables, write a query returning each department’s name and its number of enrolled students, ordered by count descending.',
    marks: 10,
    difficulty: 'MEDIUM',
    tags: ['sql', 'joins'],
    datasetId: 'ds-university',
    schemaPreview:
      'students(id, name, department_id)\ndepartments(id, name)\nenrolments(student_id, course_id, session)',
    orderSensitive: true,
    limits: DEFAULT_EXECUTION_LIMITS,
    editorSettings: { ...DEFAULT_EDITOR_SETTINGS, autocomplete: true },
  },
  {
    ...questionDefaults,
    id: 'q-predict-1',
    type: 'PREDICT_OUTPUT',
    courseId: 'course-cs201',
    prompt: 'What exactly does the following program print?',
    marks: 4,
    difficulty: 'MEDIUM',
    tags: ['semantics'],
    language: 'PYTHON',
    snippet:
      'values = [1, 2, 3]\ndoubled = [v * 2 for v in values]\nvalues.append(4)\nprint(doubled, len(values))\n',
    expectedOutput: '[2, 4, 6] 4',
    caseSensitive: false,
  },
];

export const exams: Exam[] = [
  {
    id: 'exam-cs201-final',
    institutionId: institution.id,
    courseId: 'course-cs201',
    title: 'CS201 Final Examination — Semester II',
    description:
      'Covers complexity analysis, core data structures, sorting and searching. Section B is practical.',
    status: 'ACTIVE',
    startsAt: '2026-07-27T09:00:00Z',
    endsAt: '2026-07-27T21:00:00Z',
    durationMinutes: 120,
    lateEntryMinutes: 15,
    sections: [
      {
        id: 'sec-a',
        title: 'Section A — Theory',
        description: 'Answer all questions.',
        questionIds: ['q-mcq-1', 'q-msq-1', 'q-tf-1', 'q-short-1', 'q-predict-1'],
      },
      {
        id: 'sec-b',
        title: 'Section B — Practical',
        description: 'Your code is evaluated against automated tests.',
        questionIds: ['q-code-1', 'q-debug-1'],
      },
    ],
    totalMarks: 35,
    security: DEFAULT_SECURITY_POLICY,
    grading: DEFAULT_GRADING_POLICY,
    randomisation: {
      shuffleQuestions: false,
      shuffleChoices: true,
      drawFromPool: false,
    },
    createdBy: 'user-lecturer-1',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'exam-cs305-mid',
    institutionId: institution.id,
    courseId: 'course-cs305',
    title: 'CS305 Mid-Semester Test',
    description: 'Relational modelling and SQL.',
    status: 'SCHEDULED',
    startsAt: '2026-08-10T09:00:00Z',
    endsAt: '2026-08-10T11:00:00Z',
    durationMinutes: 60,
    lateEntryMinutes: 10,
    sections: [
      {
        id: 'sec-sql',
        title: 'SQL Practical',
        questionIds: ['q-sql-1'],
      },
    ],
    totalMarks: 10,
    security: DEFAULT_SECURITY_POLICY,
    grading: DEFAULT_GRADING_POLICY,
    randomisation: {
      shuffleQuestions: false,
      shuffleChoices: false,
      drawFromPool: false,
    },
    createdBy: 'user-lecturer-1',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'exam-se210-final',
    institutionId: institution.id,
    courseId: 'course-se210',
    title: 'SE210 Final Examination',
    description: 'Architecture, process models and design principles.',
    status: 'PUBLISHED',
    startsAt: '2026-06-14T09:00:00Z',
    endsAt: '2026-06-14T12:00:00Z',
    durationMinutes: 150,
    lateEntryMinutes: 15,
    sections: [
      {
        id: 'sec-theory',
        title: 'Theory',
        questionIds: ['q-essay-1'],
      },
    ],
    totalMarks: 10,
    security: DEFAULT_SECURITY_POLICY,
    grading: { ...DEFAULT_GRADING_POLICY, autoReleaseResults: true },
    randomisation: {
      shuffleQuestions: false,
      shuffleChoices: false,
      drawFromPool: false,
    },
    createdBy: 'user-lecturer-1',
    createdAt: NOW,
    updatedAt: NOW,
  },
];
