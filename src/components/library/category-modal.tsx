'use client';

import React, { useState } from 'react';
import type { Category } from '@/types/database';
import { X, Trash2, Check } from 'lucide-react';

const PRESET_COLORS = [
  '#0284c7', // Sky
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#64748b', // Slate
  '#6366f1', // Indigo
  '#f97316', // Orange
  '#ef4444', // Red
  '#71717a', // Neutral
];

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null;
  onSave: (categoryData: {
    id?: string;
    name: string;
    description: string;
    color: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function CategoryModal({
  isOpen,
  onClose,
  categoryToEdit,
  onSave,
  onDelete,
}: CategoryModalProps) {
  const [name, setName] = useState(categoryToEdit?.name || '');
  const [description, setDescription] = useState(categoryToEdit?.description || '');
  const [color, setColor] = useState(categoryToEdit?.color || '#0284c7');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setDescription(categoryToEdit.description || '');
      setColor(categoryToEdit.color || '#0284c7');
    } else {
      setName('');
      setDescription('');
      setColor('#0284c7');
    }
    setError(null);
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a category name.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: categoryToEdit?.id,
        name: name.trim(),
        description: description.trim(),
        color,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save category';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToEdit?.id || !onDelete) return;
    if (
      window.confirm(
        `Are you sure you want to delete "${categoryToEdit.name}"? Bookmarks in this category will be moved to "To sort".`
      )
    ) {
      setSaving(true);
      try {
        await onDelete(categoryToEdit.id);
        onClose();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete category';
        setError(message);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E3] dark:border-[#26262B]">
          <h2 className="text-sm font-semibold text-[#18181B] dark:text-[#F4F4F5]">
            {categoryToEdit ? 'Edit Category' : 'New Category'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">
              Category Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Systems & Architecture"
              className="w-full px-3 py-2 bg-transparent border border-[#E5E5E3] dark:border-[#26262B] rounded-lg text-[#18181B] dark:text-[#F4F4F5] focus:outline-none focus:border-sky-600 dark:focus:border-sky-400"
            />
          </div>

          <div>
            <label className="block font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">
              Description (Used for AI suggestions)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what kind of tweets belong in this category..."
              className="w-full px-3 py-2 bg-transparent border border-[#E5E5E3] dark:border-[#26262B] rounded-lg text-[#18181B] dark:text-[#F4F4F5] focus:outline-none focus:border-sky-600 dark:focus:border-sky-400 resize-none"
            />
          </div>

          <div>
            <label className="block font-medium text-[#71717A] dark:text-[#A1A1AA] mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E3] dark:border-[#26262B]">
            {categoryToEdit && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B] hover:bg-[#27272A] dark:hover:bg-white transition-colors"
              >
                {saving ? 'Saving...' : categoryToEdit ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

