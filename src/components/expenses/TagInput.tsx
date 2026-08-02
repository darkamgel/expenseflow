import { useState, type KeyboardEvent } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commitDraft = () => {
    const value = draft.trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor="tag-input" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
        Tags
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 px-2 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 dark:border-slate-700">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Remove tag ${tag}`}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          id="tag-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={tags.length ? '' : 'Add a tag and press Enter'}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}
