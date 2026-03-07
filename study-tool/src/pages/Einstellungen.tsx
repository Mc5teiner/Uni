import { useRef } from 'react'
import { useApp } from '../context/AppContext'
import { exportData, importData } from '../utils/storage'
import { requestNotificationPermission } from '../utils/notifications'
import { Download, Upload, Bell, Trash2, Info } from 'lucide-react'

export default function EinstellungenPage() {
  const { data } = useApp()
  const importRef = useRef<HTMLInputElement>(null)

  const handleExport = () => exportData(data)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importData(file)
      localStorage.setItem('fernuni-study-tool-v1', JSON.stringify(imported))
      window.location.reload()
    } catch (err) {
      alert('Import fehlgeschlagen: ' + (err as Error).message)
    }
    e.target.value = ''
  }

  const handleNotifications = async () => {
    const granted = await requestNotificationPermission()
    alert(granted ? 'Benachrichtigungen aktiviert!' : 'Benachrichtigungen wurden abgelehnt.')
  }

  const handleReset = () => {
    if (confirm('ACHTUNG: Alle Daten werden unwiderruflich gelöscht. Fortfahren?')) {
      localStorage.removeItem('fernuni-study-tool-v1')
      window.location.reload()
    }
  }

  const totalCards = data.flashcards.length
  const totalDocs = data.documents.length
  const totalEvents = data.events.length
  const totalSessions = data.sessions.length
  const totalMinutes = data.sessions.reduce((sum, s) => sum + s.durationMinutes, 0)

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Einstellungen</h1>

      {/* Stats summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Info size={16} /> Deine Statistiken</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Module', value: data.modules.length },
            { label: 'Studienbriefe', value: totalDocs },
            { label: 'Karteikarten', value: totalCards },
            { label: 'Termine', value: totalEvents },
            { label: 'Lernsessions', value: totalSessions },
            { label: 'Lernminuten gesamt', value: totalMinutes },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xl font-bold text-slate-800">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-400 mt-4 text-center">
          Zuletzt aktualisiert: {new Date(data.lastUpdated).toLocaleString('de-DE')}
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Backup & Wiederherstellung</h2>
        <p className="text-sm text-slate-500 mb-4">
          Alle Daten werden lokal in deinem Browser gespeichert. Erstelle regelmäßig Backups!
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004488] text-sm font-medium"
          >
            <Download size={16} /> Backup exportieren
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
          >
            <Upload size={16} /> Backup importieren
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Benachrichtigungen</h2>
        <p className="text-sm text-slate-500 mb-4">
          Aktiviere Browser-Benachrichtigungen für Lernreminder und Terminhinweise.
          {typeof Notification !== 'undefined' && Notification.permission === 'granted' && (
            <span className="ml-2 text-green-600 font-medium">✓ Bereits aktiviert</span>
          )}
        </p>
        <button
          onClick={handleNotifications}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
        >
          <Bell size={16} /> Benachrichtigungen aktivieren
        </button>
      </div>

      {/* FernUni Hagen info */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 mb-6">
        <h2 className="font-semibold text-blue-800 mb-2">FernUniversität Hagen</h2>
        <p className="text-sm text-blue-700 mb-3">
          Trage deine Modulnummern direkt aus dem FernUni-System ein. Die Nummern findest du in der Virtuellen Universität (virtuelle-uni.fernuni-hagen.de) oder im Studienführer.
        </p>
        <div className="text-xs text-blue-600 space-y-1">
          <div>• Virtuellen Universität: moodle.fernuni-hagen.de</div>
          <div>• Prüfungsanmeldung: studium.fernuni-hagen.de</div>
          <div>• Bibliothek: bibliothek.fernuni-hagen.de</div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-5">
        <h2 className="font-semibold text-red-800 mb-2">Gefahrenzone</h2>
        <p className="text-sm text-red-600 mb-4">Diese Aktion ist nicht umkehrbar. Stelle sicher, dass du ein Backup hast!</p>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          <Trash2 size={16} /> Alle Daten löschen
        </button>
      </div>
    </div>
  )
}
