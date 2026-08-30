# Security notes

- Dane logowania do POSbistro są przekazywane do procesu Playwrighta wyłącznie w czasie uruchomienia i nie są zapisywane przez aplikację na dysku.
- `.env` służy jedynie do lokalnej konfiguracji, m.in. `POSBISTRO_LOCATION_ID`, i jest wykluczony z Git.
- Pobrane raporty dobowe oraz `podsumowanie.csv` są wykluczone z repozytorium.
- Repozytorium nie zawiera cookies ani zapisanej sesji przeglądarki.
- Narzędzie jest projektowane jako lokalny utility dla jednego operatora, nie jako publiczny wieloużytkownikowy serwis.

## Kontrole automatyczne

- CI testuje, że login i hasło są przekazywane do procesu roboczego przez zmienne środowiskowe i nie są zapisywane do `.env`.
- `.gitignore` chroni `.env`, katalog `downloads/` oraz wynikowe `podsumowanie.csv` przed przypadkowym commitem.
- Dane wejściowe są walidowane przed uruchomieniem Playwrighta, w tym format miesiąca i blokada równoległego procesu.
- `npm audit --audit-level=high` jest częścią bramki CI.
