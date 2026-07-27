/**
 * Answer surface dispatcher.
 *
 * Maps a question variant to its input control. The theory types are fully
 * wired here; practical types render a clearly-labelled stub until the
 * Monaco/sandbox milestone, so the navigation, autosave and submission flow
 * can be exercised across a realistic mixed paper today.
 *
 * The exhaustive `switch` means adding a question type is a compile error
 * until it is handled here.
 */

import React from 'react';
import { useAttemptStore } from '../../stores/attempt-store';
import { emptyAnswer } from '../../types/answer';
import type { Answer } from '../../types/answer';
import type { Question } from '../../types/question';
import { QUESTION_TYPE_LABELS } from '../../types/question';
import { Badge } from '../ui/primitives';

/** Renders the prompt. Markdown rendering arrives with the editor milestone. */
const Prompt: React.FC<{ text: string }> = ({ text }) => (
  <p className="mb-5 whitespace-pre-wrap text-base leading-relaxed text-slate-200">
    {text}
  </p>
);

/** Reads the current answer, creating an empty one of the right kind. */
function useAnswer(question: Question, kind: Answer['kind']): Answer {
  const stored = useAttemptStore((s) => s.answers[question.id]);
  return stored ?? emptyAnswer(question.id, kind);
}

const ChoiceInput: React.FC<{
  question: Extract<Question, { type: 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' }>;
  multiple: boolean;
}> = ({ question, multiple }) => {
  const setAnswer = useAttemptStore((s) => s.setAnswer);
  const answer = useAnswer(question, 'CHOICE');
  const selected = answer.kind === 'CHOICE' ? answer.choiceIds : [];

  const toggle = (choiceId: string) => {
    if (answer.kind !== 'CHOICE') return;
    const nextIds = multiple
      ? selected.includes(choiceId)
        ? selected.filter((id) => id !== choiceId)
        : [...selected, choiceId]
      : [choiceId];
    setAnswer({ ...answer, choiceIds: nextIds });
  };

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{QUESTION_TYPE_LABELS[question.type]}</legend>
      {question.choices.map((choice) => {
        const isSelected = selected.includes(choice.id);
        return (
          <label
            key={choice.id}
            className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
              isSelected
                ? 'border-sky-600 bg-sky-950/40'
                : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/40'
            }`}
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={question.id}
              checked={isSelected}
              onChange={() => toggle(choice.id)}
              className="size-4 accent-sky-500"
            />
            <span className="text-sm text-slate-200">{choice.text}</span>
          </label>
        );
      })}
    </fieldset>
  );
};

const BooleanInput: React.FC<{
  question: Extract<Question, { type: 'TRUE_FALSE' }>;
}> = ({ question }) => {
  const setAnswer = useAttemptStore((s) => s.setAnswer);
  const answer = useAnswer(question, 'BOOLEAN');
  const value = answer.kind === 'BOOLEAN' ? answer.value : null;

  return (
    <fieldset className="flex gap-3">
      <legend className="sr-only">True or false</legend>
      {[true, false].map((option) => (
        <label
          key={String(option)}
          className={`flex cursor-pointer items-center gap-2 rounded-md border px-5 py-3 transition-colors ${
            value === option
              ? 'border-sky-600 bg-sky-950/40'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <input
            type="radio"
            name={question.id}
            checked={value === option}
            onChange={() =>
              answer.kind === 'BOOLEAN' && setAnswer({ ...answer, value: option })
            }
            className="size-4 accent-sky-500"
          />
          <span className="text-sm text-slate-200">{option ? 'True' : 'False'}</span>
        </label>
      ))}
    </fieldset>
  );
};

const TextInput: React.FC<{
  question: Question;
  multiline: boolean;
  maxLength?: number;
  placeholder?: string;
}> = ({ question, multiline, maxLength, placeholder }) => {
  const setAnswer = useAttemptStore((s) => s.setAnswer);
  const answer = useAnswer(question, 'TEXT');
  const value = answer.kind === 'TEXT' ? answer.value : '';

  const update = (next: string) => {
    if (answer.kind !== 'TEXT') return;
    setAnswer({ ...answer, value: next });
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => update(e.target.value)}
          rows={12}
          maxLength={maxLength}
          placeholder={placeholder}
          className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 p-3 font-sans text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline focus:outline-2 focus:outline-sky-500"
          aria-label="Your answer"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => update(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline focus:outline-2 focus:outline-sky-500"
          aria-label="Your answer"
        />
      )}
      {multiline && (
        <p className="mt-2 text-xs text-slate-500">{wordCount} words</p>
      )}
    </div>
  );
};

/** Stub shown for practical types pending the editor milestone. */
const PracticalStub: React.FC<{ question: Question; note: string }> = ({
  question,
  note,
}) => (
  <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/40 p-6">
    <div className="mb-2 flex items-center gap-2">
      <Badge tone="info">{QUESTION_TYPE_LABELS[question.type]}</Badge>
      <span className="text-xs text-slate-500">Editor arrives in Milestone 2</span>
    </div>
    <p className="text-sm text-slate-400">{note}</p>
  </div>
);

export const QuestionSurface: React.FC<{ question: Question }> = ({ question }) => {
  const body = (() => {
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        return <ChoiceInput question={question} multiple={false} />;
      case 'MULTIPLE_SELECT':
        return <ChoiceInput question={question} multiple />;
      case 'TRUE_FALSE':
        return <BooleanInput question={question} />;
      case 'SHORT_ANSWER':
        return (
          <TextInput
            question={question}
            multiline={false}
            maxLength={question.maxLength}
            placeholder="Type your answer"
          />
        );
      case 'ESSAY':
        return (
          <TextInput
            question={question}
            multiline
            placeholder="Write your essay here"
          />
        );
      case 'PREDICT_OUTPUT':
        return (
          <div>
            <pre className="mb-4 overflow-x-auto rounded-md border border-slate-700 bg-slate-950 p-4 text-sm text-slate-200">
              <code>{question.snippet}</code>
            </pre>
            <TextInput
              question={question}
              multiline
              placeholder="Exact program output"
            />
          </div>
        );
      case 'FILL_IN_BLANK':
      case 'MATCHING':
      case 'ORDERING':
        return (
          <PracticalStub
            question={question}
            note="This interaction needs a drag-and-drop surface, which lands with the exam-runner milestone."
          />
        );
      case 'WRITE_CODE':
      case 'COMPLETE_CODE':
      case 'DEBUG_CODE':
      case 'REFACTOR_CODE':
        return (
          <PracticalStub
            question={question}
            note="Monaco editor, language selection, public-test runner and console output land next."
          />
        );
      case 'SQL':
        return (
          <PracticalStub
            question={question}
            note="SQL editor with schema browser and a read-only query runner against the seeded dataset."
          />
        );
      case 'HTML_CSS':
      case 'REACT':
        return (
          <PracticalStub
            question={question}
            note="Multi-file editor with a sandboxed live preview."
          />
        );
      case 'LINUX':
      case 'GIT':
        return (
          <PracticalStub
            question={question}
            note="Interactive terminal backed by an ephemeral container."
          />
        );
      case 'NETWORKING':
        return (
          <PracticalStub
            question={question}
            note="Topology canvas driven by the network simulator."
          />
        );
      case 'CYBERSECURITY':
        return (
          <PracticalStub
            question={question}
            note="Challenge environment with flag submission."
          />
        );
    }
  })();

  return (
    <div>
      <Prompt text={question.prompt} />
      {body}
    </div>
  );
};
