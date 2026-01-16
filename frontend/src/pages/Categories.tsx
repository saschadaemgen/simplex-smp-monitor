import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useCategories } from '../hooks/useApi';
import { categoriesApi, Category } from '../api/client';

export default function Categories() {
  const { t } = useTranslation();
  const { data: categoriesData, loading, refetch } = useCategories();
  const categories = (categoriesData as { results?: Category[] })?.results || (Array.isArray(categoriesData) ? categoriesData : []);
  
  const [editing, setEditing] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#0ea5e9', description: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      await categoriesApi.create(formData);
      setFormData({ name: '', color: '#0ea5e9', description: '' });
      refetch();
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    setSaving(true);
    try {
      await categoriesApi.update(id, formData);
      setEditing(null);
      refetch();
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Delete category '${category.name}'?`)) return;
    try {
      await categoriesApi.delete(category.id);
      refetch();
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    }
  };

  const startEdit = (category: Category) => {
    setEditing(category.id);
    setFormData({ name: category.name, color: category.color, description: category.description || '' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{t('common.category')}</h1>
          <Link to="/servers" className="text-slate-400 hover:text-white transition-colors">← {t('nav.servers')}</Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        <div className="space-y-6">
          {/* New Category Form */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Neue Kategorie</h2>
            <div className="flex flex-wrap gap-4">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
              />
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-12 h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                placeholder="Beschreibung (optional)"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
              />
              <button
                onClick={handleCreate}
                disabled={saving || !formData.name.trim()}
                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                {saving ? 'Speichern...' : 'Hinzufügen'}
              </button>
            </div>
          </div>

          {/* Categories List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-12 text-center">
              <p className="text-slate-400">Keine Kategorien vorhanden</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category: Category) => (
                <div key={category.id} className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-5">
                  {editing === category.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-slate-600"
                      />
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                          className="w-10 h-10 bg-slate-800 border border-slate-700 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Beschreibung"
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate(category.id)} disabled={saving}
                          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm transition-colors">
                          Speichern
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors">
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }}></span>
                          <h3 className="text-white font-semibold">{category.name}</h3>
                        </div>
                        <span className="text-xs text-slate-500">{category.server_count} Server</span>
                      </div>
                      {category.description && (
                        <p className="text-sm text-slate-400 mb-3">{category.description}</p>
                      )}
                      <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800/50 text-sm">
                        <button onClick={() => startEdit(category)} className="text-slate-500 hover:text-primary-400 transition-colors">
                          Bearbeiten
                        </button>
                        <button onClick={() => handleDelete(category)} className="text-red-500 hover:text-red-400 transition-colors">
                          Löschen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}