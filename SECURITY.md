# Security notes

- Dane logowania do POSbistro są przekazywane do procesu Playwrighta wyłącznie w czasie uruchomienia i nie są zapisywane przez aplikację na dysku.
- `.env` służy jedynie do lokalnej konfiguracji, m.in. `POSBISTRO_LOCATION_ID`, i jest wykluczony z Git.
- Pobrane raporty dobowe oraz `podsumowanie.csv` są wykluczone z repozytorium.
- Repozytorium nie zawiera cookies ani zapisanej sesji przeglądarki.
- Narzędzie jest projektowane jako lokalny utility dla jednego operatora, nie jako publiczny wieloużytkownikowy serwis.
