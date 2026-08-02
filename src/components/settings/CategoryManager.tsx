import { useCallback, useEffect, useState } from 'react';
import type { Category } from '../../types';
import { categoryRepository } from '../../repositories';
import { Button, Card, EmptyState, ErrorState, Modal } from '../common';
import { Spinner } from '../common/Spinner';
import { InputField } from '../common/FormField';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';

const COLOR_SWATCHES = [
  '#f97316', '#22c55e', '#6366f1', '#0ea5e9', '#eab308', '#ec4899',
  '#a855f7', '#14b8a6', '#3b82f6', '#ef4444', '#06b6d4', '#8b5cf6',
  '#64748b', '#f43f5e', '#d946ef', '#94a3b8',
];

const ICON_SUGGESTIONS = ['🍽️', '🛒', '🏠', '🚌', '⛽', '🛍️', '🎬', '💡', '🎓', '🏥', '✈️', '🔁', '🛡️', '💆', '🎁', '📦', '🐾', '🏋️', '🎮', '📱'];

interface CategoryFormState {
  id?: string;
  name: string;
  icon: string;
  color: string;
}

const EMPTY_FORM: CategoryFormState = { name: '', icon: '📦', color: COLOR_SWATCHES[0] };

export function CategoryManager() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await categoryRepository.ensureSeeded();
      const all = await categoryRepository.getAll();
      setCategories(all.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setForm({ id: category.id, name: category.name, icon: category.icon, color: category.color });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (form.id) {
        await categoryRepository.update(form.id, { name: form.name.trim(), icon: form.icon, color: form.color });
        showToast('Category updated.', 'success');
      } else {
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.sortOrder), -1);
        await categoryRepository.create({
          name: form.name.trim(),
          icon: form.icon,
          color: form.color,
          isDefault: false,
          status: 'active',
          sortOrder: maxOrder + 1,
        });
        showToast('Category created.', 'success');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save category.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async (category: Category) => {
    if (category.status === 'active') {
      await categoryRepository.archive(category.id);
      showToast(`${category.name} archived.`, 'info');
    } else {
      await categoryRepository.unarchive(category.id);
      showToast(`${category.name} restored.`, 'info');
    }
    await load();
  };

  const handleDelete = async (category: Category) => {
    const ok = await confirm({
      title: 'Delete category',
      message: `Delete "${category.name}"? If it's still linked to any expenses, it will be archived instead of deleted.`,
      danger: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    const result = await categoryRepository.deleteOrArchive(category.id);
    showToast(result === 'deleted' ? `${category.name} deleted.` : `${category.name} is in use, so it was archived instead.`, 'info');
    await load();
  };

  const visible = categories.filter((c) => (showArchived ? true : c.status === 'active'));

  if (loading) return <Spinner label="Loading categories…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Expense categories</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs font-medium text-slate-500 hover:underline dark:text-slate-400"
          >
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
          <Button size="sm" onClick={openAdd}>
            + Add category
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="🏷️" title="No categories" description="Add a category to start organizing your expenses." />
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visible.map((category) => (
            <li
              key={category.id}
              className={`flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800 ${
                category.status === 'archived' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-base"
                  style={{ backgroundColor: `${category.color}22` }}
                  aria-hidden="true"
                >
                  {category.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{category.name}</p>
                  {category.status === 'archived' && <p className="text-xs text-slate-400">Archived</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(category)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label={`Edit ${category.name}`}
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleArchiveToggle(category)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label={category.status === 'active' ? `Archive ${category.name}` : `Restore ${category.name}`}
                >
                  {category.status === 'active' ? '🗄️' : '♻️'}
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950"
                  aria-label={`Delete ${category.name}`}
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? 'Edit category' : 'Add category'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <InputField
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_SUGGESTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base ${
                    form.icon === icon ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-slate-200 dark:border-slate-700'
                  }`}
                  aria-label={`Use icon ${icon}`}
                  aria-pressed={form.icon === icon}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={`h-8 w-8 rounded-full border-2 ${form.color === color ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Use color ${color}`}
                  aria-pressed={form.color === color}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
