# FernUni Hagen Study Organizer

Studienorganisations-Tool für das Fernstudium an der FernUniversität Hagen –
speziell für Berufstätige, die nebenberuflich studieren.

## Starten

```bash
cd study-tool
npm install
npm run dev
```
Dann im Browser öffnen: http://localhost:5173
Features
Dashboard
	∙	Tagesübersicht mit heutigen Terminen
	∙	Lernstreak (aufeinanderfolgende Lerntage)
	∙	Wochengrafik der Lernaktivität
	∙	Sofortanzeige fälliger Karteikarten
	∙	Kommende Prüfungen auf einen Blick
	∙	Modulfortschritt mit Lesestatus und Kartenstand
Module
	∙	Anlegen mit FernUni-Modulnummer, ECTS, Semester und Prüfungsdatum
	∙	Farbkodierung pro Modul
	∙	Statusfilter: Aktiv / Geplant / Pausiert / Abgeschlossen
	∙	Modulübergreifende Statistiken (Lernminuten, fällige Karten, Briefe)
Studienbriefe (PDF)
	∙	PDF-Upload direkt im Browser
	∙	Integrierter PDF-Viewer
	∙	Lesefortschritt wird automatisch gespeichert – du landest beim nächsten
Öffnen wieder auf der richtigen Seite
	∙	Lesezeichen pro Seite mit eigenem Label
	∙	Notizen pro Seite
	∙	Fortschrittsbalken pro Dokument
Karteikarten
	∙	SM-2 Spaced-Repetition-Algorithmus (wie Anki)
	∙	6-stufige Bewertung nach jeder Karte
	∙	Automatische Berechnung des nächsten Wiederholungstermins
	∙	Lernmodus mit Fortschrittsanzeige
	∙	Tags pro Karte
	∙	Filterung nach Modul
Kalender & Studienplan
	∙	Termintypen: Prüfung, Abgabe, Lernblock, Präsenzveranstaltung, Erinnerung
	∙	Monatsansicht mit farbigen Ereignissen
	∙	Tagesdetailansicht mit Terminverwaltung
	∙	Lernsessions erfassen (Datum, Modul, Dauer, Thema)
	∙	Liste kommender Termine in der Seitenleiste
	∙	Filterung nach Modul
Einstellungen
	∙	Backup exportieren (JSON-Datei)
	∙	Backup importieren (Wiederherstellung)
	∙	Browser-Benachrichtigungen aktivieren
	∙	Direktlinks zur Virtuellen Universität, Prüfungsanmeldung und Bibliothek
	∙	Gesamtstatistiken auf einen Blick
Datenspeicherung
Alle Daten werden ausschließlich lokal im Browser gespeichert (localStorage).
Es gibt keinen Server und keine Cloud-Synchronisation. Regelmäßige Backups über
die Einstellungsseite werden empfohlen.




# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
