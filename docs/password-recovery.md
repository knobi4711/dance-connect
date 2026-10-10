# Passwort zurücksetzen

In Supabase unter **Authentication → URL Configuration → Redirect URLs** muss
für den Android-Build exakt diese URL freigegeben sein:

```text
com.danceconnect.app://auth/recovery
```

Für Web zusätzlich die tatsächliche Web-Adresse mit `/passwort-zuruecksetzen`
eintragen, z. B. `http://localhost:5173/passwort-zuruecksetzen` in der lokalen
Entwicklung. Die **Site URL** muss auf die erreichbare Web-Anwendung zeigen.
Supabase kann bei nicht erlaubten Weiterleitungsadressen auf diese Site URL
zurückfallen. `localhost:3000` ist auf einem Handy kein erreichbarer Web-Server.

Das Reset-E-Mail-Template muss den Supabase-Platzhalter `{{ .ConfirmationURL }}`
als Link verwenden, damit die angeforderte Weiterleitung erhalten bleibt.

## Prüfung auf Android

1. Aktuelle APK installieren.
2. In der App über „Passwort vergessen?“ eine **neue** E-Mail anfordern.
3. Den Link auf demselben Android-Handy öffnen. DanceConnect muss sich öffnen
   und „Neues Passwort festlegen“ anzeigen (bei laufender und beendeter App).
4. Passwort zweimal eingeben und speichern.
5. Abmelden und mit dem neuen Passwort anmelden.
6. Abgelaufene Links dürfen keine Passwortänderung ermöglichen.

Die Android-App empfängt den Recovery-Link über das Capacitor-App-Plugin.
Web verwendet das Supabase-Ereignis `PASSWORD_RECOVERY`. Die native
iOS-Linkregistrierung ist noch nicht eingerichtet.
