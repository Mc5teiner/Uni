export interface FernUniModule {
  number: string
  name: string
  ects: number
  faculty: string
}

// Source: FernUniversität in Hagen module catalog
// ECTS: 10 for regular modules (300h workload), 5 for seminars/practicals
export const FERNUNI_MODULES: FernUniModule[] = [
  // ── Wirtschaftswissenschaft ────────────────────────────────────────────────
  { number: '31001', name: 'Einführung in die Wirtschaftswissenschaft', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31011', name: 'Externes Rechnungswesen – Buchhaltung, Jahresabschluss, Steuern', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31021', name: 'Investition und Finanzierung', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31031', name: 'Internes Rechnungswesen und funktionale Steuerung', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31041', name: 'Mikroökonomik', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31051', name: 'Makroökonomik', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31061', name: 'Grundlagen des Privat- und Wirtschaftsrechts', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31071', name: 'Einführung in die Wirtschaftsinformatik', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31101', name: 'Grundlagen der Wirtschaftsmathematik und Statistik', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31102', name: 'Unternehmensführung', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31501', name: 'Finanzmanagement', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31511', name: 'Strategisches Management', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31521', name: 'Logistik', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31531', name: 'Personalführung', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31541', name: 'Produktion', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31551', name: 'Geldtheorie und Geldpolitik', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31561', name: 'Wachstum und Konjunktur', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31571', name: 'Finanzwissenschaft', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31621', name: 'Grundlagen des Marketing', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31671', name: 'Strategisches und internationales Marketing', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31681', name: 'Konsumentenverhalten und Markenmanagement', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31691', name: 'Marketing Mix Management', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31701', name: 'Personalmanagement', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31711', name: 'Organisation', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31721', name: 'Unternehmensethik', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31801', name: 'Wirtschaftsprüfung und Steuerberatung', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31811', name: 'Unternehmensbewertung und Mergers & Acquisitions', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31821', name: 'Controlling', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31831', name: 'Unternehmensbesteuerung', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31841', name: 'Internationale Rechnungslegung', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31911', name: 'Jahresabschluss nach IFRS', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '31921', name: 'Konzernrechnungslegung', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32001', name: 'Econometrics', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32011', name: 'Wirtschaftsstatistik', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32021', name: 'Entscheidungstheorie', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32101', name: 'Entrepreneurship und Unternehmertum', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32111', name: 'Innovation und Technologiemanagement', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32201', name: 'Einführung in die Wirtschaftspsychologie', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32211', name: 'Arbeits- und Organisationspsychologie', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32221', name: 'Markt- und Werbepsychologie', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32301', name: 'Wirtschaftsinformatik – Management von IT-Projekten', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32401', name: 'Operations Research', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32491', name: 'Angewandte Datenanalyse', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32501', name: 'Wirtschaftsethik', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32601', name: 'Strategisches und internationales Marketing', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32701', name: 'Umweltmanagement', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32711', name: 'Business Intelligence', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32801', name: 'Banken und Kapitalmärkte', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32811', name: 'Finanzderivate', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32821', name: 'Internationale Wirtschaftspolitik', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32901', name: 'Arbeitsmarktökonomik', ects: 10, faculty: 'Wirtschaftswissenschaft' },
  { number: '32911', name: 'Verhaltensökonomik', ects: 10, faculty: 'Wirtschaftswissenschaft' },

  // ── Rechtswissenschaft ────────────────────────────────────────────────────
  { number: '55100', name: 'Propädeutikum', ects: 5, faculty: 'Rechtswissenschaft' },
  { number: '55101', name: 'Allgemeiner Teil des BGB', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55103', name: 'Schuldrecht Allgemeiner Teil', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55104', name: 'Staats- und Verfassungsrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55105', name: 'Arbeitsvertragsrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55106', name: 'Schuldrecht Besonderer Teil', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55108', name: 'Sachenrecht und Recht der Kreditsicherung', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55109', name: 'Handels- und Gesellschaftsrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55110', name: 'Internationales Privat- und Zivilprozessrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55111', name: 'Verwaltungsrecht Allgemeiner Teil', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55112', name: 'Rhetorik, Verhandeln und Mediation', ects: 5, faculty: 'Rechtswissenschaft' },
  { number: '55113', name: 'Zivilprozessrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55114', name: 'Europarecht I', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55115', name: 'Europarecht II', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55116', name: 'Einführung in die Betriebswirtschaftslehre für Juristen', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55117', name: 'Wirtschaftsstrafrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55118', name: 'Verwaltungsprozessrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55201', name: 'Wettbewerbs- und Kartellrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55202', name: 'Kapitalgesellschaftsrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55203', name: 'Insolvenzrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55204', name: 'Kollektives Arbeitsrecht I', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55207', name: 'Steuerrechtliche Grundlagen und Einführung in das Ertragssteuerrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55211', name: 'Immaterialgüterrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55213', name: 'Datenschutzrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55217', name: 'Antidiskriminierungsrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55221', name: 'Legal English', ects: 5, faculty: 'Rechtswissenschaft' },
  { number: '55502', name: 'Familien- und Erbrecht', ects: 10, faculty: 'Rechtswissenschaft' },
  { number: '55504', name: 'Strafrecht Allgemeiner Teil', ects: 10, faculty: 'Rechtswissenschaft' },

  // ── Mathematik & Informatik ───────────────────────────────────────────────
  { number: '61110', name: 'Grundlagen der Linearen Algebra', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61111', name: 'Mathematische Grundlagen', ects: 5, faculty: 'Mathematik & Informatik' },
  { number: '61112', name: 'Lineare Algebra', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61113', name: 'Elementare Zahlentheorie mit MAPLE', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61115', name: 'Mathematische Grundlagen der Kryptografie', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61116', name: 'Algebra', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61210', name: 'Grundlagen der Analysis', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61211', name: 'Analysis', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61311', name: 'Einführung in die Stochastik', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61314', name: 'Stochastische Prozesse', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61412', name: 'Lineare Optimierung', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61413', name: 'Diskrete Mathematik', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61414', name: 'Effiziente Graphenalgorithmen', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61521', name: 'Einführung in die Numerische Mathematik', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '61811', name: 'Mathematische Grundlagen von Data Science', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63012', name: 'Softwaresysteme', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63013', name: 'Computersysteme', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63016', name: 'Einführung in die objektorientierte Programmierung', ects: 5, faculty: 'Mathematik & Informatik' },
  { number: '63017', name: 'Datenbanken und Sicherheit im Internet', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63081', name: 'Grundpraktikum Programmierung', ects: 5, faculty: 'Mathematik & Informatik' },
  { number: '63112', name: 'Übersetzerbau', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63113', name: 'Datenstrukturen und Algorithmen', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63117', name: 'Data Mining', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63118', name: 'Datenbanken', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63122', name: 'Architektur und Implementierung von Datenbanksystemen', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63123', name: 'Data Engineering für Data Science', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63211', name: 'Verteilte Systeme', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63212', name: 'Betriebssysteme', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63213', name: 'Algorithmische Geometrie', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63412', name: 'Informationsvisualisierung im Internet', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63413', name: 'Dokumenten- und Wissensmanagement im Internet', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63414', name: 'Multimedia-Informationssysteme', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63415', name: 'Information Retrieval', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63511', name: 'Einführung in die technischen und theoretischen Grundlagen der Informatik', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63512', name: 'Sicherheit im Internet', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63514', name: 'Simulation', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63611', name: 'Einführung in die objektorientierte Programmierung', ects: 5, faculty: 'Mathematik & Informatik' },
  { number: '63612', name: 'Objektorientierte Programmierung', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63711', name: 'Anwendungsorientierte Mikroprozessoren', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63712', name: 'Parallel Programming', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63811', name: 'Einführung in die imperative Programmierung', ects: 5, faculty: 'Mathematik & Informatik' },
  { number: '63812', name: 'Software Engineering', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63912', name: 'Grundlagen der Theoretischen Informatik', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63914', name: 'Komplexitätstheorie', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '63916', name: 'Effiziente Algorithmen', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '64090', name: 'Geschäftsprozessmodellierung und Process Mining', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '64111', name: 'Betriebliche Informationssysteme', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '64112', name: 'Entscheidungsmethoden in unternehmensweiten Softwaresystemen', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '64113', name: 'E-Business Management', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '64311', name: 'Kommunikations- und Rechnernetze', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '64313', name: 'Mobile Security', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '64401', name: 'Maschinelles Lernen', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '64402', name: 'Formale Argumentation', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '64403', name: 'Logik', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '64511', name: 'Einführung in Data Science', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '65001', name: 'Grundlagen der Informatik 1', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '65002', name: 'Grundlagen der Informatik 2', ects: 10, faculty: 'Mathematik & Informatik' },
  { number: '65010', name: 'Moderne Methoden der Software-Entwicklung', ects: 10, faculty: 'Mathematik & Informatik' },
]

/** Generate an ordered list of the next N semesters starting from the current or upcoming one */
export function getNextSemesters(count = 10): string[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12

  // WS starts October (month 10), SS starts April (month 4)
  // Determine the current semester
  const semesters: string[] = []

  // If we're in Jan-Mar, the WS is the previous year's WS
  let wsYear = month < 4 ? year - 1 : year
  let isSS = month >= 4 && month < 10 // April–September = SS

  // Build semesters in order
  // We'll just enumerate from the current one
  if (isSS) {
    // currently SS
    semesters.push(`SS ${year}`)
    // next: WS year/year+1
    let wy = year
    for (let i = 1; semesters.length < count; i++) {
      semesters.push(`WS ${wy}/${String(wy + 1).slice(-2)}`)
      wy++
      if (semesters.length < count) semesters.push(`SS ${wy}`)
    }
  } else {
    // currently WS
    semesters.push(`WS ${wsYear}/${String(wsYear + 1).slice(-2)}`)
    let sy = wsYear + 1
    for (let i = 1; semesters.length < count; i++) {
      semesters.push(`SS ${sy}`)
      if (semesters.length < count) {
        semesters.push(`WS ${sy}/${String(sy + 1).slice(-2)}`)
        sy++
      }
    }
  }

  return semesters.slice(0, count)
}
