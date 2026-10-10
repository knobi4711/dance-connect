# DanceConnect – Vereinsplattform für Tanzvereine

DanceConnect unterstützt Tanzvereine bei der Organisation ihres Vereinslebens. Die Anwendung wird für **Web, Android und iOS** entwickelt. Alle Plattformen greifen auf dasselbe zentrale Backend und dieselbe Datenbasis zu.

Jeder Verein erhält einen strikt getrennten Bereich. Ein Benutzerkonto kann mehreren Vereinen angehören und in jedem Verein unterschiedliche Rollen haben.

## 1. Zielbild und Projektentscheidungen

- **Frontend:** React + TypeScript + Vite.
- **Mobile Apps:** Capacitor für Android und iOS; Veröffentlichung in den jeweiligen App-Stores.
- **Web:** Responsive Website für Desktop, Tablet und Smartphone; keine installierbare PWA erforderlich.
- **Betrieb:** Ausschließlich online, ohne Offline-Datenhaltung oder Synchronisierung offline erfasster Änderungen.
- **Backend:** Base44 wird abgelöst. Als neue Backend-Grundlage ist Supabase mit PostgreSQL vorgeschlagen.
- **Vereine:** Getrennte Vereinsbereiche mit vereinsbezogenen Mitgliedschaften und Berechtigungen.
- **Erste Version:** Vereins- und Trainingsverwaltung einschließlich Trainern und Gruppen, Tanz-Repertoire, Veranstaltungen, Chat und einem Statistikmodul für Vorstandsberichte.
- **Spätere Versionen:** Abstimmungen, Musik, DTSA, Vereinsnetzwerk, externe Tanzdaten-Anreicherung, KI-Bilder und Push-Benachrichtigungen.

Die nachfolgende Architekturplanung geht von Supabase und einer gemeinsamen Datenbank mit serverseitig erzwungener logischer Mandantentrennung aus. Die endgültige Backend-Auswahl ist vor Implementierungsbeginn zu bestätigen. Separate Datenbanken oder Hosting-Instanzen pro Verein sind in diesem Vorschlag nicht vorgesehen.

### Name und Domain

- **Anwendungsname:** DanceConnect.
- **Zweck:** Vereinsinternes Portal für Tanzvereine mit Mitgliederinformationen, Trainingsorganisation und Austausch.
- **Vorgesehene Web-Domain:** `dance-connect.app`; der Bindestrich wird nur in der Domain verwendet.
- **Registrierungsstatus, Stand 9. Oktober 2026:** Die offizielle Registry liefert für `dance-connect.app` keinen Registrierungseintrag. Die verbindliche Verfügbarkeitsprüfung und Registrierung beim Registrar stehen noch aus.
- **Domain ohne Bindestrich:** `danceconnect.app` ist seit dem 26. Dezember 2019 über Squarespace Domains II LLC registriert. Das derzeit eingetragene Ablaufdatum ist der 26. Dezember 2026; daraus ergibt sich keine Zusage einer späteren Verfügbarkeit, da die Registrierung verlängert werden kann. Eine nicht erreichbare Website bedeutet nicht, dass die Domain frei ist.
- **Kontakt zum bisherigen Inhaber:** Die Kontaktdaten sind nicht öffentlich. Squarespace bietet ein [WHOIS-Kontaktformular](https://domains.squarespace.com/whois-contact-form) an. Eine Kaufanfrage wurde bislang nicht versendet.

Quellen: [RDAP-Eintrag für danceconnect.app](https://rdap.squarespace.domains/domain/danceconnect.app) und [Registry-Abfrage für dance-connect.app](https://pubapi.registry.google/rdap/domain/dance-connect.app).

## 2. Architektur

```text
Web-Browser          Android-App          iOS-App
     |                    |                  |
     +--------------------+------------------+
                          |
              Authentifizierung und API
                          |
                 Gemeinsames Backend
                 ├── PostgreSQL-Datenbank
                 ├── Private Dateiablage
                 ├── Echtzeit-Chat
                 └── Serverseitige Funktionen
```

### Technologieplan

| Bereich | Technologie / Aufgabe |
|---------|-----------------------|
| Frontend | React + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui auf Basis von Radix UI |
| Designvorlage | Stitch über MCP als verbindliche visuelle Referenz |
| Icons | lucide-react |
| Mobile Bereitstellung | Capacitor mit Android- und iOS-Projekten |
| Backend, vorgeschlagen | Supabase |
| Datenbank, vorgeschlagen | PostgreSQL mit Migrationen und Row-Level Security (RLS) |
| Anmeldung, vorgeschlagen | Supabase Auth |
| Dateiablage, vorgeschlagen | Private Supabase-Storage-Buckets mit geprüften Zugriffsrechten |
| Echtzeit, vorgeschlagen | Supabase Realtime für vereinsinterne Chat-Nachrichten |
| Serverseitige Logik | Geschützte Funktionen für privilegierte Abläufe und spätere Integrationen |

Die gemeinsame React-Anwendung stellt Oberfläche und Anwendungslogik für alle Plattformen bereit. Native Anforderungen werden über Capacitor integriert. Anmeldung, Weiterleitungen und Dateizugriffe müssen sowohl im Browser als auch in den mobilen Apps funktionieren.

Für iOS-Builds wird eine macOS-/Xcode-Umgebung benötigt, lokal oder über einen Build-Dienst. Mobile Builds werden bereits während der Entwicklung geprüft.

Bei fehlender Internetverbindung zeigt die Anwendung einen verständlichen Verbindungszustand und ermöglicht erneutes Laden. Änderungen dürfen ohne erfolgreiche Serverbestätigung nicht als gespeichert erscheinen.

## 3. Vereinsbereiche und Mitgliedschaften

### Benutzerkonto und Vereinswahl

- Eine Person besitzt ein gemeinsames Benutzerkonto.
- Ein Konto kann mehrere aktive Vereinsmitgliedschaften haben.
- Nach der Anmeldung wird der aktive Verein ausgewählt; ein Vereinswechsler ermöglicht den Wechsel.
- Rollen und vereinsbezogene Angaben sind an die jeweilige Mitgliedschaft gebunden.
- Ein Verein erhält keinen Einblick in Mitgliedschaften oder Aktivitäten bei anderen Vereinen.
- Beim Vereinswechsel werden vereinsbezogene Ansichten, Daten-Caches und Echtzeit-Abonnements zurückgesetzt bzw. neu gebunden.

Beispiel:

```text
Benutzerkonto: Erika
├── Tanzverein A → Vereinsadmin
├── Tanzverein B → Mitglied
└── Tanzverein C → Trainer
```

### Serverseitige Mandantentrennung

- Jeder vereinsbezogene Datensatz enthält eine `club_id`.
- Lesezugriffe erfordern eine aktive Mitgliedschaft im betreffenden Verein.
- Schreibzugriffe prüfen zusätzlich die Rolle und gegebenenfalls die Eigentümerschaft des Datensatzes.
- RLS setzt diese Regeln in der Datenbank durch; eine Filterung im Frontend allein genügt nicht.
- Beziehungen zwischen Fachdatensätzen werden gegen vereinsübergreifende Zuordnungen abgesichert, beispielsweise durch passende zusammengesetzte Fremdschlüssel.
- Private Dateien und Echtzeit-Kanäle unterliegen denselben Vereinsgrenzen.
- Privilegierte serverseitige Funktionen müssen Mitgliedschaft und Rechte ausdrücklich prüfen.
- Mitgliedschaftsänderungen und Entzug von Rechten müssen auch bei Dateizugriffen und Echtzeit-Verbindungen berücksichtigt werden.

## 4. Rollen und Berechtigungen

Die erste Version verwendet drei Rollen pro Vereinsmitgliedschaft:

| Rolle | Rechte im jeweiligen Verein |
|-------|-----------------------------|
| **Vereinsadmin** | Vereinsprofil, Einladungen, Mitglieder, Rollen und Fachinhalte verwalten; Chat-Nachrichten löschen |
| **Trainer** | Vereinsinhalte lesen, als Trainer Gruppen und Trainings zugeordnet werden; alle Mitgliedsfunktionen nutzen |
| **Mitglied** | Vereinsinhalte lesen, Trainings zu- oder absagen, Tänze als bekannt markieren und Chat-Nachrichten senden |

Trainer erhalten in der ersten Version keine zusätzlichen Verwaltungsrechte allein durch ihre Rolle. Erweiterte Trainerrechte werden bei Bedarf später ergänzt, insbesondere für DTSA.

Ein Trainerprofil ist ein eigenständiger Vereinsdatensatz und kann optional mit einer Mitgliedschaft verknüpft sein. Ein Trainerprofil setzt kein Benutzerkonto voraus und verleiht selbst keine Berechtigungen.

Mitglieder bearbeiten ihr eigenes Benutzerprofil. Zusagen und Tanzkenntnisse werden ausschließlich für die eigene Mitgliedschaft erfasst. Die Autorenzuordnung von Chat-Nachrichten erfolgt anhand der angemeldeten Person.

## 5. Funktionsumfang der ersten Version

### Benutzerkonto und Vereinsverwaltung

- Anmeldung, Abmelden und Passwort zurücksetzen.
- Eigenes Benutzerprofil verwalten.
- Vereinsprofil mit Name, Ort, Kontakt, Website, Logo und Beschreibung.
- Mitglieder gezielt in einen Verein einladen.
- Mitgliedschaften verwalten, deaktivieren und Rollen zuweisen.
- Wechsel zwischen den eigenen Vereinen.
- Die Bereitstellung eines neuen Vereins und seiner ersten Admin-Mitgliedschaft wird vor Umsetzung des Einladungsablaufs festgelegt.

### Dashboard

Persönlicher Überblick innerhalb des aktiven Vereins:

- Begrüßung des angemeldeten Mitglieds.
- Übersicht über Trainings, Tänze, Trainer und Gruppen.
- Anstehende Trainings und Veranstaltungen.
- Aktuelle Chat-Nachrichten.

### Statistik und Vorstandsberichte

Die erste Version enthält ein vereinsinternes Statistikmodul, mit dem Vereinsadmins und Trainer belastbare Übersichten über das Vereinsleben erstellen können. Diese Rollen bilden in der ersten Version die berechtigten Nutzer für Vorstands- und Trainingsberichte; eine gesonderte Vorstandrolle wird später geprüft. Die Auswertungen werden aus den vorhandenen Vereins-, Trainings-, Teilnahme-, Gruppen-, Trainer-, Tanz- und Veranstaltungsdaten abgeleitet; parallele manuelle Zählungen im Frontend sind nicht zulässig.

- Auswertung ausschließlich im aktiven Verein und nur für aktive Vereinsadmins oder Trainer.
- Zeitraumfilter, mindestens für aktuelle Woche, Monat, Quartal, Jahr und frei wählbare Zeiträume.
- Trainingsstatistik mit Anzahl geplanter, bestätigter, abgesagter und abgeschlossener Trainings.
- Teilnehmerstatistik mit Zusagen, Absagen, Teilnahmequoten und durchschnittlicher Teilnehmerzahl je Training.
- Auswertungen nach Gruppe, Trainer, Tanz und Zeitraum.
- Übersicht aktiver Mitglieder, Gruppen, Trainer, Tänze und Veranstaltungen.
- Entwicklung der Trainings- und Teilnehmerzahlen über die Zeit.
- Kennzeichnung fehlender oder unvollständiger Daten; Teilnahmeabsagen und nicht erfasste Angaben dürfen nicht stillschweigend als tatsächliche Anwesenheit interpretiert werden.
- Export einer gefilterten Auswertung als CSV für die weitere Vorstandarbeit.
- Druckoptimierte Berichtansicht für Sitzungen; ein PDF-Export kann darauf aufbauend ergänzt werden.
- Anzeige des Erstellungszeitpunkts, des ausgewerteten Vereins und des Zeitraums in jedem Bericht.
- Keine vereinsübergreifenden Vergleiche und keine Offenlegung personenbezogener Detaildaten gegenüber nicht berechtigten Mitgliedern.

Die Statistik stellt Teilnahmeabsichten und vorhandene Verwaltungsdaten dar. Da die erste Version keine gesonderte Anwesenheitserfassung vorsieht, darf die Anwendung eine Zusage nicht als tatsächlich besuchte Trainingseinheit ausgeben.

### Trainer

- Trainerprofile mit Foto, Spezialisierungen, Biografie und Kontaktdaten.
- Aktiv-Status und mehrere Spezialisierungen pro Trainer.
- Optionaler Bezug zu einer Vereinsmitgliedschaft.
- Vereinsadmins können Profile erstellen, bearbeiten, aktivieren/deaktivieren und löschen.

### Gruppen

- Gruppen mit Name, Beschreibung, Level, Tanzstil, Kapazität und Farbe.
- Level entsprechend der fachlichen Vorlage: Anfänger, Fortgeschritten, Profi, Kinder, Jugend.
- Mitgliederzuordnung und Zuweisung mehrerer Trainer.
- Alphabetisch sortierte Tanzstil-Auswahl.
- Vereinsadmins können Gruppen und Zuordnungen verwalten.
- KI-generierte Gruppenbilder folgen in einer späteren Version.

### Trainings

- Geplante und vergangene Trainingstermine mit Datum, Uhrzeit, Ort und Notizen.
- Zuordnung zu einer Gruppe sowie zu Trainern und Tänzen.
- Status: Geplant, Bestätigt, Abgesagt, Abgeschlossen.
- Mitglieder können für sich selbst zu- oder absagen.
- Vereinsadmins können Trainings erstellen, bearbeiten und löschen.
- Zu-/Absagen sind Teilnahmeabsichten; eine gesonderte Erfassung tatsächlicher Anwesenheit ist für die erste Version nicht vorgesehen.

### Tänze

- Vereinsinternes Tanz-Repertoire mit Suche und Filtern, insbesondere nach Kategorie.
- Details: Name, Kategorie, Rhythmus, Schwierigkeit, Choreograf, Musikangabe, Wände, Counts und Motion.
- Video-Verweis, Stepsheet-Verweis bzw. Notizen und Bild.
- Mitglieder markieren Tänze über „Kann ich tanzen“ als bekannt.
- Vereinsadmins können Tänze und zugehörige Metadaten verwalten.
- Tanzdaten werden zunächst manuell gepflegt.
- Musikangaben beschreiben die zum Tanz gehörende Musik; ein Audio-Player ist erst später vorgesehen.

### Veranstaltungen

- Kommende und vergangene Veranstaltungen.
- Titel, Beschreibung, Bild, Datum, Uhrzeit und Ort.
- Kategorien: Aufführung, Turnier, Workshop, Party, Ausfahrt, Sonstiges.
- Filterung nach Kategorie.
- Vereinsadmins können Veranstaltungen erstellen, bearbeiten und löschen.

### Chat

- Mehrere vereinsinterne Kanäle, beispielsweise Allgemein, Training und Veranstaltungen.
- Kanäle sind in der ersten Version für aktive Mitglieder des jeweiligen Vereins zugänglich.
- Nachrichtenverlauf mit Autor und Zeitstempel.
- Mitglieder können Textnachrichten senden.
- Neue Nachrichten erscheinen in der geöffneten Anwendung in Echtzeit.
- Vereinsadmins verwalten Kanäle und können Nachrichten löschen.
- Push-Benachrichtigungen folgen später.

## 6. Datenmodell der ersten Version

Tabellennamen dienen als technische Planungsgrundlage. Beziehungen mit mehreren Beteiligten werden über Zuordnungstabellen statt über ID-Arrays modelliert.

### Konten und Vereine

| Entität | Zweck |
|---------|-------|
| `profiles` | Gemeinsames Benutzerprofil mit Bezug zum Auth-Konto |
| `clubs` | Vereinsstammdaten |
| `club_memberships` | Zuordnung Konto–Verein mit Rolle, Status und vereinsbezogenen Angaben |
| `club_invitations` | Vereinsbezogene Einladungen mit Ablauf und Annahmestatus |

Globale Profildaten dürfen nicht pauschal für alle angemeldeten Personen lesbar sein. Die Anzeige anderer Mitglieder wird auf berechtigte gemeinsame Vereinskontexte und die dort benötigten Angaben beschränkt.

### Fachentitäten

| Entität | Zweck |
|---------|-------|
| `trainers` | Vereinsbezogene Trainerprofile |
| `groups` | Trainingsgruppen |
| `group_memberships` | Zuordnung von Vereinsmitgliedschaften zu Gruppen |
| `group_trainers` | Zuordnung von Trainern zu Gruppen |
| `trainings` | Trainingstermine, Gruppe, Ort, Zeit, Status und Notizen |
| `training_trainers` | Trainer eines Trainings |
| `training_dances` | Tänze eines Trainings |
| `training_attendance` | Zu-/Absage pro Training und Mitgliedschaft |
| `dances` | Tanz-Repertoire und Detailangaben |
| `dance_skills` | Als bekannt markierte Tänze pro Mitgliedschaft |
| `events` | Vereinsveranstaltungen |
| `chat_channels` | Vereinsinterne Chat-Kanäle |
| `chat_messages` | Kanal, Autor, Text und Zeitstempel |

Statistiken werden in der ersten Version aus den Fachentitäten und ihren Zuordnungstabellen berechnet. Es wird keine frei editierbare Statistikzahl als Ersatz für die zugrunde liegenden Daten gespeichert. Für reproduzierbare Vorstandsberichte werden Zeitraum, Vereinsbezug, Filter, Erstellungszeitpunkt und Exportformat nachvollziehbar festgehalten; eine dauerhafte Berichtshistorie wird vor Umsetzung des PDF- oder Archivexports gesondert festgelegt.

### Metadaten

Vereinsbezogene Kategorien und Auswahllisten werden in passenden Tabellen gepflegt, insbesondere:

- `dance_categories`
- `dance_difficulties`
- `dance_rhythms`
- `dance_motions`
- `dance_styles`

### Datenintegrität

- Höchstens eine Mitgliedschaft pro Benutzerkonto und Verein.
- Höchstens eine Zu-/Absage pro Training und Mitgliedschaft.
- Höchstens eine Kenntnis-Markierung pro Tanz und Mitgliedschaft.
- Keine mehrfachen identischen Gruppen- oder Trainerzuordnungen.
- Keine vereinsübergreifenden Verknüpfungen zwischen Fachdatensätzen.
- Zeitpunkte werden eindeutig mit Zeitzonenbezug gespeichert und passend angezeigt.
- Lösch- und Deaktivierungsregeln berücksichtigen abhängige Daten und historische Zuordnungen.

## 7. Backend-Abläufe

| Ablauf | Anforderungen |
|--------|---------------|
| Einladung erstellen und annehmen | Adminrechte beim Erstellen; sichere, ablaufende Einladung; passende Vereinszuordnung beim Annehmen |
| Mitgliedschaften und Rollen verwalten | Nur berechtigte Vereinsadmins; keine eigenständige Rechteausweitung durch Mitglieder |
| Fachinhalte verwalten | Vereinsmitgliedschaft und erforderliche Adminrolle prüfen |
| Zu-/Absage setzen | Eigene Mitgliedschaft und Training im selben Verein prüfen; eindeutigen Status speichern |
| Tanzkenntnis setzen | Eigene Mitgliedschaft und Tanz im selben Verein prüfen |
| Chat-Nachricht senden | Aktive Mitgliedschaft und Kanalzugriff prüfen; Autor serverseitig zuordnen |
| Dateien bereitstellen | Private Speicherung; Zugriff nur nach Prüfung der Vereinsberechtigung |
| Statistiken und Vorstandsberichte erzeugen | Admin- oder Trainerrolle im aktiven Verein prüfen; alle Kennzahlen serverseitig aus berechtigten Quelldaten berechnen; Filter und Zeitraum validieren; keine vereinsübergreifenden Daten liefern |

Privilegierte Zugangsdaten verbleiben auf dem Server und werden nicht in Web- oder Mobile-Bundles eingebunden. Gewöhnliche Datenzugriffe werden durch Datenbankregeln abgesichert; privilegierte oder mehrstufige Abläufe erhalten geschützte serverseitige Funktionen.

## 8. Design, Navigation und Layout

### Stitch-MCP-Designvorlage

Die Gestaltung von DanceConnect basiert auf der vorgesehenen **Stitch-Vorlage**, die über MCP eingebunden und als zentrale visuelle Referenz verwendet wird.

- Stitch liefert die Designvorlage für Layouts, Seitenaufbau, Komponenten, Abstände, Farben, Typografie und responsive Zustände.
- Die Vorlage wird für Web, Android und iOS angepasst, ohne die gemeinsame React-Codebasis aufzugeben.
- Aus Stitch abgeleitete Ansichten werden als wiederverwendbare React-Komponenten mit TypeScript, Tailwind CSS und shadcn/ui umgesetzt.
- Die fachliche Funktionalität, Authentifizierung, Berechtigungen und Datenlogik bleiben unabhängig von Stitch.
- Änderungen an der Stitch-Vorlage werden über den MCP-Workflow geprüft und anschließend kontrolliert in das Design-System und die Komponenten übernommen.
- Die Umsetzung darf die Vereinsabgrenzung, Barrierefreiheit, mobile Bedienbarkeit oder die festgelegten Touch-Target-Mindestgrößen nicht beeinträchtigen.
- Stitch-generierte oder abgeleitete Ergebnisse werden vor dem Einchecken auf responsives Verhalten, visuelle Konsistenz und funktionierende Interaktionen geprüft.

Stitch ist damit die Quelle für die visuelle Gestaltung, aber nicht die Laufzeit- oder Backend-Abhängigkeit der Anwendung. Die produktive App wird aus der versionierten React-Codebasis gebaut.

### Design-System

- Token-basiertes Design mit CSS-Variablen.
- Farbpalette: Grün als Primärfarbe, Violett als Sekundärfarbe, Orange als Akzent.
- Schriftarten: Plus Jakarta Sans für Überschriften und Be Vietnam Pro für Fließtext.
- Anzeige-Modi: Hell, Dunkel und automatisch entsprechend der Systemeinstellung.
- Responsive Ansichten für Desktop, Tablet und Smartphone.
- Mobile Ergonomie mit Safe-Area-Insets, mindestens 44 px großen Touch-Zielen und mindestens 16 px Schriftgröße in Eingabefeldern.
- Verständliche Lade-, Leer-, Fehler- und Verbindungszustände.

### Navigation

- Desktop: Sidebar mit den verfügbaren Modulen.
- Mobil: kompakte Navigation mit Menü und gut erreichbaren Hauptaktionen.
- Sichtbarer aktiver Verein und Vereinswechsler.
- Benutzerbereich mit Profil, Theme-Einstellung und Abmelden.
- Vereinsadministration entsprechend den Rechten im aktiven Verein.
- Anpassbare Menü-Reihenfolge ist eine spätere Komfortfunktion.

### Geplante Routen

Der Vereinskontext wird ausdrücklich in den Fachrouten geführt. Eine Vereins-ID in der URL ersetzt keine Berechtigungsprüfung.

| Pfad | Seite |
|------|-------|
| `/login` | Anmeldung |
| `/passwort-zuruecksetzen` | Passwort zurücksetzen |
| `/einladung` | Einladung annehmen |
| `/vereine` | Auswahl der eigenen Vereine |
| `/profil` | Eigenes Benutzerprofil |
| `/verein/:clubId` | Dashboard des Vereins |
| `/verein/:clubId/mitglieder` | Mitgliederverwaltung |
| `/verein/:clubId/trainings` | Trainings |
| `/verein/:clubId/trainer` | Trainer |
| `/verein/:clubId/gruppen` | Gruppen |
| `/verein/:clubId/taenze` | Tänze |
| `/verein/:clubId/events` | Veranstaltungen |
| `/verein/:clubId/chat` | Chat |
| `/verein/:clubId/statistik` | Statistiken und Vorstandsberichte |
| `/verein/:clubId/einstellungen` | Vereinsprofil und Administration |

## 9. Spätere Ausbaustufen

Die folgenden Funktionen bleiben Teil des langfristigen Zielbilds, gehören jedoch nicht zur ersten Veröffentlichung. Ihre Detailregeln werden vor der jeweiligen Umsetzung konkretisiert.

### Abstimmungen

- Frage mit mehreren Antwortoptionen, Ersteller und Enddatum.
- Eine Stimme pro Person und Abstimmung.
- Live-Ergebnisse mit Prozentverteilung.
- Berechtigungen für Erstellung und Bearbeitung werden vor Umsetzung festgelegt.

### Musik

- Playlisten und MP3-Uploads.
- Song-Reihenfolge und Metadaten.
- Audio-Player mit Play/Pause, Skip, Seek und automatischem Weiterlauf.
- Feste Player-Leiste; mobile Hintergrundwiedergabe benötigt gesonderte native Integration.

### DTSA

- Planung und Durchführung von Abnahmen des Deutschen Tanzsportabzeichens.
- Vorgesehene Stufen aus der ursprünglichen Vorlage: Bronze, Silber, Gold, Brillant, Gold 5, Gold 10, Brillant 5 und Brillant 10.
- Prüfling, Prüfer, Datum, Ort, Tänze, Bewertungen und Ergebnis.
- Status- und Ergebnisverwaltung sowie automatische Berechnung nach fachlich bestätigten Regeln.
- Prüfberechtigungen, Bewertungsregeln und Bestehensbedingungen werden vor Implementierung festgelegt.

### Vereinsnetzwerk

- Ausdrückliche Veröffentlichung ausgewählter Tänze und Veranstaltungen über eine getrennte Freigabeebene.
- Interne Originaldaten bleiben im jeweiligen Vereinsbereich geschützt.
- Mitgliedschaften, Chats und Teilnahmeangaben werden nicht veröffentlicht.
- Regeln für Widerruf und Aktualisierung veröffentlichter Inhalte werden vor Umsetzung definiert.

### Integrationen und Komfortfunktionen

- CopperKnob-Anreicherung nach Prüfung verfügbarer Zugriffsmöglichkeiten.
- KI-generierte Gruppenbilder und Tanz-Cover über serverseitige Integrationen.
- Push-Benachrichtigungen für mobile Apps.
- Persönlich anpassbare Menü-Reihenfolge.

## 10. Automatisierte Auslieferung (CI/CD)

Änderungen sollen nach erfolgreicher Prüfung automatisch in die jeweiligen Zielsysteme ausgerollt werden. Manuelle Produktionsänderungen außerhalb des Versionskontrollsystems sind nicht vorgesehen.

### Automatischer Ablauf

```text
Commit / Pull Request
        |
        +── Linting, Typecheck und Tests
        +── Sicherheits- und Build-Prüfungen
        |
     Merge in den Release-Branch
        |
        +── Supabase: Migrationen und Edge Functions
        +── Website: Produktions-Build und Deployment
        +── Android: Signierter Build und Google Play Release
        +── iOS: Signierter Build und App Store Connect Release
```

### Supabase

- Datenbankänderungen werden ausschließlich als versionierte Migrationen eingecheckt.
- Änderungen an Tabellen, RLS-Policies, Funktionen, Storage-Regeln und Edge Functions werden durch die Pipeline automatisch ausgerollt.
- Migrationen werden in einer festgelegten Reihenfolge und nur einmal ausgeführt.
- Vor dem Produktions-Rollout werden Migrationen in einer Testumgebung angewendet und geprüft.
- Backups, Migrationsprotokolle und ein dokumentierter Rückfallplan sind verpflichtend.
- Produktions-Geheimnisse und Supabase-Service-Keys werden ausschließlich als verschlüsselte CI/CD-Secrets verwendet.

### Website

- Jeder freigegebene Release erzeugt automatisch einen reproduzierbaren Produktions-Build.
- Der Build wird automatisch auf das Web-Hosting deployt.
- Nach dem Deployment werden Erreichbarkeit, zentrale Routen und die Verbindung zum Backend automatisch geprüft.
- Bei einem fehlgeschlagenen Deployment bleibt die zuletzt erfolgreiche Version aktiv bzw. wird automatisch wiederhergestellt.

### Android und Google Play Store

- Die Pipeline erhöht die Build-Version, erstellt das signierte Android-App-Bundle (`.aab`) und lädt es automatisch in den Google Play Store hoch.
- Release-Keystore und Play-Store-Zugangsdaten werden ausschließlich verschlüsselt in der CI/CD-Umgebung gespeichert.
- Interne Test- und Produktions-Tracks können automatisiert bedient werden.
- Nach erfolgreichem Testlauf wird die konfigurierte Version automatisch zur Veröffentlichung freigegeben.

### iOS und App Store Connect

- Da DanceConnect auch für iOS veröffentlicht wird, erstellt die Pipeline zusätzlich automatisch das signierte iOS-Artefakt und lädt es zu App Store Connect hoch.
- Zertifikate, Provisioning-Profile und App-Store-Connect-Zugangsdaten werden ausschließlich als verschlüsselte CI/CD-Secrets verwaltet.
- TestFlight- und Produktions-Releases werden entsprechend der Release-Konfiguration automatisiert bedient.

### Grenzen der Automatisierung

- Apple- und Google-Prüfungen sowie deren Freigabezeiten können nicht durch DanceConnect gesteuert werden.
- Nach einer erfolgreichen Plattformprüfung kann die Veröffentlichung automatisch erfolgen; eine externe Store-Prüfung bleibt jedoch erforderlich.
- Notfall-Rollbacks müssen trotz automatischer Auslieferung jederzeit manuell ausgelöst werden können.

## 11. Umsetzungsplan

### Phase 1 – Technische Grundlage

- React-/TypeScript-/Vite-Projekt und Design-System aufsetzen.
- Stitch-MCP-Verbindung einrichten, Vorlage übernehmen und zentrale UI-Komponenten daraus ableiten.
- Backend-Entscheidung bestätigen und Backend einrichten.
- Datenmodell, Migrationen und Entwicklungsumgebungen vorbereiten.
- Android- und iOS-Projekte über Capacitor integrieren.
- CI/CD-Pipeline mit automatischen Tests, Supabase-Migrationen, Web-Deployment und Store-Builds einrichten.

### Phase 2 – Konten und Vereinszugriff

- Anmeldung, Profil und Passwort-Wiederherstellung.
- Vereinsanlage einschließlich erster Admin-Mitgliedschaft festlegen und umsetzen.
- Einladungen, Mitgliedschaften, Rollen und Vereinswechsler.
- Datenbank-, Datei- und Echtzeit-Zugriffsregeln.
- Gezielte Prüfungen der Vereinsgrenzen, Mehrfachmitgliedschaften und Rollen.

### Phase 3 – Vereins- und Trainingsverwaltung

- Vereinsprofil und Mitgliederverwaltung.
- Trainer, Gruppen und Zuordnungen.
- Trainings, Status und Zu-/Absagen.

### Phase 4 – Tänze und Veranstaltungen

- Repertoire, Detailansichten, Suche und Filter.
- Tanzkenntnisse und Metadatenpflege.
- Veranstaltungen mit Bildern und Kategorien.

### Phase 5 – Chat und Dashboard

- Vereinsinterne Kanäle, Nachrichtenverlauf und Echtzeit-Nachrichten.
- Admin-Moderation.
- Persönliche Übersicht für den aktiven Verein.
- Statistikmodul mit Trainings-, Teilnehmer-, Gruppen-, Trainer-, Tanz- und Veranstaltungsübersichten.
- Zeitraumfilter, Vorstandsberichtansicht und CSV-Export.

### Phase 6 – Prüfung und Veröffentlichung

- Durchgängige Prüfung der Kernabläufe auf Web, Android und iOS.
- Prüfung von Anmeldung, Einladungslinks, Dateizugriffen, Verbindungsverlust und Vereinswechsel.
- Prüfung des Statistikmoduls mit unterschiedlichen Zeiträumen, Rollen, leeren Datenmengen, abgesagten Trainings und mehreren Vereinen.
- Automatische Auslieferung an Supabase, Website, Google Play Store und App Store Connect aktivieren.

## 12. Abnahmekriterien der ersten Version

- Alle drei Plattformen verwenden dieselben zentral gespeicherten Daten.
- Ein Konto kann zwischen mehreren Vereinen wechseln und besitzt dort unabhängig vergebene Rollen.
- Mitglieder eines Vereins können keine internen Daten, Dateien oder Chat-Nachrichten anderer Vereine abrufen, auch nicht durch direkte API-Aufrufe oder manipulierte IDs.
- Vereinsadmins können die vorgesehenen Vereins- und Fachinhalte verwalten.
- Mitglieder können Trainings zu-/absagen, Tänze als bekannt markieren und vereinsintern chatten.
- Vereinsadmins können belastbare Statistikübersichten für den aktiven Verein nach Zeitraum filtern und als CSV exportieren.
- Statistikwerte stimmen mit den berechtigten Quelldaten überein und stellen Zusagen nicht als tatsächliche Anwesenheit dar.
- Nicht berechtigte Vereinsmitglieder und andere Vereine können keine Statistikdaten abrufen.
- Chat-Nachrichten werden in berechtigten geöffneten Clients in Echtzeit angezeigt.
- Die Anwendung stellt Verbindungsfehler nachvollziehbar dar und meldet fehlgeschlagene Schreibvorgänge nicht als erfolgreich.
- Web, Android und iOS bieten nutzbare responsive Oberflächen und funktionierende Anmeldeabläufe.
- Ein freigegebener Release führt automatisch die geprüften Supabase-Migrationen und Backend-Änderungen aus.
- Ein freigegebener Release deployed automatisch die Website.
- Ein freigegebener Release erstellt und signiert automatisch die Android- und iOS-Builds und lädt sie zu Google Play bzw. App Store Connect hoch.
- CI/CD-Secrets, Signaturschlüssel und Service-Keys werden nicht im Quellcode gespeichert.
- Automatische Tests, Health Checks, Deployment-Protokolle und Rollback-Möglichkeiten sind eingerichtet.
- Base44 ist keine Laufzeitabhängigkeit der neuen Anwendung.
