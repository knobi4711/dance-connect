# Passkey-Anmeldung

DanceConnect nutzt Supabase Passkeys (WebAuthn). Auf Mobilgeräten öffnet sich
der Plattform-Authenticator und bestätigt die Anmeldung per Fingerabdruck,
Face ID oder Geräte-PIN. Im Browser kann Windows Hello verwendet werden.

## Supabase konfigurieren

Passkeys müssen im Supabase-Projekt aktiviert werden:

1. In Supabase **Authentication → Passkeys** öffnen.
2. **Enable Passkey authentication** aktivieren.
3. Als Relying Party Display Name `DanceConnect` eintragen.
4. `rp_id` auf die echte Produktionsdomain setzen, zum Beispiel `danceconnect.de`.
5. Als Origins die HTTPS-URL der Web-App eintragen.

Die Werte in `supabase/config.toml` gelten für die lokale Entwicklung. Die
Produktionswerte müssen im Supabase-Dashboard gesetzt werden. Die RP-ID darf
nach der ersten Registrierung nicht mehr geändert werden.

## Native Apps

Für Android muss die Produktionsdomain über `/.well-known/assetlinks.json`
mit `com.danceconnect.app` und dem SHA-256-Fingerprint des Signaturzertifikats
verknüpft werden. Für iOS ist eine `webcredentials`-Associated-Domain sowie
eine passende `/.well-known/apple-app-site-association` erforderlich.
