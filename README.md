# PiTzA

Niewielkie narzędzie automatyzujące miesięczne rozliczenie sprzedaży pizzy na podstawie raportów z **POSbistro**.

Projekt powstał dla dwóch współpracujących lokali gastronomicznych. Jeden lokal przygotowywał pizzę, a drugi sprzedawał ją swoim klientom i rozliczał się z partnerem za faktycznie sprzedane sztuki.

## Problem

POSbistro pozwalało pobrać raport sprzedaży za wybrany okres, ale do rozliczenia między lokalami potrzebne było inne zestawienie:

**ile pizz każdego rodzaju sprzedano każdego dnia miesiąca.**

Ręczne otwieranie raportu dla każdego dnia, wyszukiwanie pozycji i przepisywanie wyników do Excela było czasochłonne i podatne na błędy.

PiTzA automatyzuje właśnie ten brakujący fragment procesu.

## Jak działa

Użytkownik podaje:

- login do własnego konta POSbistro,
- hasło,
- miesiąc i rok raportu.

Następnie program:

1. loguje się do panelu POSbistro przy pomocy Playwrighta,
2. przechodzi przez każdy dzień wskazanego miesiąca,
3. pobiera osobny raport dobowy `item_sales.csv`,
4. odczytuje sprzedane pozycje i ich ilości,
5. wybiera produkty należące do zdefiniowanej listy pizz,
6. sumuje sprzedaż według dnia i rodzaju,
7. generuje jedno miesięczne `podsumowanie.csv`.

```text
POSbistro
   ↓
raport dobowy CSV × każdy dzień miesiąca
   ↓
Playwright
   ↓
filtrowanie pozycji
   ↓
agregacja dzienna
   ↓
podsumowanie miesiąca
   ↓
CSV
```

W wynikowym pliku każdy wiersz odpowiada jednemu dniowi, każda kolumna rodzajowi pizzy, a ostatni wiersz zawiera sumy miesięczne.

## Technologie

- Node.js
- JavaScript
- Playwright
- Express
- Server-Sent Events (SSE) do podglądu postępu
- CSV
- Docker

## Uruchomienie

### 1. Instalacja

```bash
npm install
npx playwright install chromium
```

### 2. Konfiguracja

Skopiuj:

```text
.env.example → .env
```

i ustaw identyfikator własnej lokalizacji POSbistro:

```env
POSBISTRO_LOCATION_ID=...
```

Login i hasło **nie są zapisywane w repozytorium ani w pliku `.env`**. Użytkownik wpisuje je w formularzu podczas uruchomienia procesu.

### 3. Start

```bash
npm start
```

Aplikacja będzie dostępna domyślnie pod:

```text
http://localhost:3000
```

## Konfiguracja produktów

Lista produktów uwzględnianych w raporcie znajduje się w:

```text
agreguj.cjs
```

w tablicy:

```js
const PIZZAS = [...]
```

Projekt został napisany dla konkretnego menu, dlatego przy wykorzystaniu w innym lokalu listę należy dostosować do nazw produktów występujących w raportach POSbistro.

## Prywatność i dostęp

Repozytorium nie zawiera:

- loginu ani hasła do POSbistro,
- cookies ani danych sesji,
- identyfikatora realnej lokalizacji,
- rzeczywistych raportów sprzedaży,
- wynikowych danych finansowych.

Program wymaga własnego, autoryzowanego konta POSbistro. Nie omija zabezpieczeń platformy — automatyzuje czynności wykonywane przez uprawnionego użytkownika.

## Ograniczenia

To narzędzie zostało stworzone dla konkretnego procesu i konkretnej wersji panelu POSbistro.

Zmiany po stronie:

- formularza logowania,
- adresów raportów,
- selektorów HTML,
- formatu `item_sales.csv`

mogą wymagać aktualizacji automatyzacji.

Obecna wersja jest przeznaczona przede wszystkim do lokalnego, pojedynczego uruchomienia. Nie jest projektowana jako publiczna wieloużytkownikowa usługa SaaS.

## O projekcie

PiTzA jest przykładem małej automatyzacji stworzonej pod rzeczywisty problem operacyjny.

Nie było potrzeby wymieniać systemu POS ani budować dużego systemu od zera. Potrzebne dane już istniały — brakowało jedynie sposobu ich zebrania w formie odpowiadającej faktycznemu rozliczeniu między lokalami.

**istniejący system → automatyczne pozyskanie danych → transformacja → gotowy raport**

## Status

**Completed utility / portfolio project**

Narzędzie zostało przygotowane dla konkretnego procesu biznesowego i działa pod warunkiem posiadania autoryzowanego dostępu do POSbistro oraz zgodności obecnego panelu i raportów z wersją, dla której powstała automatyzacja.

## Automatyczna weryfikacja

Repozytorium zawiera GitHub Actions uruchamiane przy zmianach kodu. CI sprawdza:

- składnię plików JavaScript,
- generowanie listy dni dla miesiąca, w tym rok przestępny,
- budowanie URL raportu POSbistro,
- walidację danych przed uruchomieniem procesu Playwright,
- normalizację nazw produktów,
- parser CSV, w tym pola w cudzysłowach i polski separator dziesiętny,
- agregację dzienną i miesięczną na danych testowych,
- ignorowanie produktów spoza zdefiniowanej listy,
- kontrakty bezpieczeństwa repozytorium (`.env`, raporty i dane logowania),
- `npm audit --audit-level=high`,
- budowanie obrazu Docker.

Testy nie logują się do prawdziwego POSbistro i nie pobierają rzeczywistych raportów. Zależna od zewnętrznego panelu część Playwright wymaga autoryzowanego konta i pozostaje testem integracyjnym wykonywanym ręcznie.
