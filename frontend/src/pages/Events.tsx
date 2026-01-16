import { useTranslation } from 'react-i18next'

export default function Events() {
  const { t } = useTranslation()
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50">
        <h1 className="text-2xl font-bold text-white">
          {t('nav.events')}
        </h1>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6">
          <p className="text-slate-400">
            Events content coming soon...
          </p>
        </div>
      </div>
    </div>
  )
}