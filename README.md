# Sprawdzarka praw pasażera kolei

Jeden plik: `index.html`. Zero build stepu, zero zależności. Otwórz z dysku albo wrzuć na hosting.

## Podmiana stałych technicznych

Wszystko w bloku `STAŁE DO PODMIANY` na górze `<script>` (szukaj `// TODO: podmień`):

| Stała | Co to jest |
|---|---|
| `FORM_ENDPOINT` | URL, na który formularz robi `POST` (JSON). Domyślnie `/api/lead` — Vercel Function w tym repo (patrz sekcja „Backend formularza”). Puste = ekran sukcesu bez wysyłki (tryb offline/demo). |
| `ANALYTICS_ENDPOINT` | URL do `navigator.sendBeacon`. Domyślnie `/api/track` (patrz „Backend formularza” / analityka niżej). Puste = `track()` nic nie robi (no-op). |
| `CONTACT_EMAIL` | Adres kontaktowy — używany w stopce (RODO) i jako `mailto:` fallback przy błędzie sieci formularza. |
| `ADMIN_NAME` | Nazwa/imię administratora danych do klauzuli RODO w stopce. |

## Jak edytować treści prawne

Wszystkie treści prawne siedzą w jednym obiekcie `RULES` (w `<script>`, sekcja `RULES — treści prawne`). Nie dotykaj kodu renderującego pod spodem — edytuj tylko dane:

- `RULES.events` — lista checkboxów w Kroku 2 (`id` + etykieta widoczna dla użytkownika).
- `RULES.regionalWarning` — wyróżniony blok ostrzegawczy dla ścieżki B (regionalni). `title` + tablica akapitów `body`.
- `RULES.cardsA` — karty wyników wyłącznie dla ścieżki A (dalekobieżni).
- `RULES.cardsCommon` — karty wspólne dla obu ścieżek.

Każda karta: `id`, `requires(s)` (funkcja: które checkboxy z Kroku 2 muszą być zaznaczone), `title`, `benefit` (co przysługuje), `evidence` (czego trzeba jako dowód, albo `null` gdy nie dotyczy), opcjonalnie `hint` (dodatkowa wskazówka pod kartą).

Ściąga (sekcja 4) renderuje się automatycznie z tego samego obiektu `RULES` — nie trzeba edytować dwóch miejsc.

**Nie dopisuj nowych przepisów, kwot ani terminów bez źródła.** Zostały świadomie pominięte: konkretny termin na złożenie reklamacji (`<!-- TODO: zweryfikować terminy w aktualnym regulaminie przewoźnika -->`) — sprawdź go w regulaminie danego przewoźnika przed publikacją, jeśli chcesz go dodać.

## Analityka

`track(nazwa)` wysyła `sendBeacon` na `ANALYTICS_ENDPOINT` (JSON: `{event, t, path}`). Zdarzenia wysyłane: `view`, `checker_start`, `checker_carrier_A`, `checker_carrier_B`, `checker_result`, `checker_cta_form` (klik „Napisz maila za mnie” w wyniku), `scroll_50`, `form_start`, `form_submit`, `form_submit_diy`, `form_submit_pelna_obsluga`.

Próg 16 zł w podpowiedzi przy polu `cena` (stała `PROG_MINIMALNY_ZL` w skrypcie) to ten sam fakt co karta „Uwaga: próg minimalny” w `RULES.cardsA` — jeśli zmienisz jedno, zmień i drugie.

Endpoint: `api/track.js` (Vercel Function, ta sama baza Neon co formularz, osobna tabela `events`: `event`, `path`, `client_time`, `created_at`). Tabela tworzy się sama przy pierwszym zapisie.

**Odczyt lejka konwersji** (Neon SQL Editor):
```sql
select event, count(*) from events group by event order by count(*) desc;
```
Porównaj `checker_result` (ile osób doszło do wyniku) z `form_submit` (ile zostawiło maila) — to jest główna liczba z tego MVP.

## Backend formularza (`api/lead.js`)

Formularz POST-uje na `/api/lead` — Vercel Function w tym repo (Node.js, zero-config, wykryta automatycznie z katalogu `/api`). Zapisuje zgłoszenie do Postgresa (Neon, przez Vercel Marketplace — nie ręczne SQL na własnym serwerze).

**Provisioning (jednorazowo, w dashboardzie Vercel):**

1. Projekt na vercel.com → zakładka **Storage** → **Create Database** / **Marketplace Database** → wybierz **Neon**.
2. Vercel sam tworzy bazę i dodaje zmienną środowiskową `DATABASE_URL` do projektu (wszystkie środowiska).
3. Redeploy (Vercel robi to zwykle automatycznie po dodaniu zmiennej; jak nie — Deployments → ... → Redeploy).

Tabelę `leads` tworzy sam kod (`CREATE TABLE IF NOT EXISTS` przy każdym wywołaniu) — nie trzeba ręcznej migracji.

**Podgląd zgłoszeń:** Neon dashboard → SQL Editor:
```sql
select * from leads order by created_at desc;
```

**Pola w tabeli:** `przewoznik`, `pociag`, `podroz_data`, `cena` (może być `null`), `email`, `zakres` (`diy` albo `pelna_obsluga`), `created_at`. E-mail zapisuje się zawsze, niezależnie od ceny biletu — także przy cenie poniżej progu 16 zł (patrz `cenaNote` w `index.html`), bo ma się przydać do newslettera.

Jeśli `DATABASE_URL` nie jest ustawione, endpoint zwraca błąd 500 zamiast cicho gubić zgłoszenia — front-end w takiej sytuacji pokaże komunikat sieciowy z fallbackiem `mailto:`.

## Deploy na Vercel

1. Zainstaluj CLI: `npm i -g vercel` (jeśli jeszcze nie masz).
2. W katalogu z `index.html` (i `README.md`) uruchom: `vercel` — potwierdź jako statyczny projekt bez build commandu.
3. Podmień `FORM_ENDPOINT` / `ANALYTICS_ENDPOINT` na docelowe adresy (np. Vercel Functions we własnym projekcie API) **przed** deployem produkcyjnym.
4. Deploy produkcyjny: `vercel --prod`.

Brak build stepu — Vercel wystarczy wskazać katalog jako statyczny (Framework: „Other”, Build Command: puste, Output Directory: `.`).

## Test przed publikacją

- Otwórz `index.html` bezpośrednio z dysku (podwójny klik) — sprawdzarka musi działać bez serwera i bez sieci.
- Sprawdź na 375px, 768px, 1440px szerokości.
- Przejdź całą ścieżkę A i całą ścieżkę B w Kroku 2 (zaznacz różne kombinacje checkboxów) i sprawdź wynik.
- Sprawdź formularz: walidację, komunikaty błędów, stan ładowania, ekran sukcesu, oraz zachowanie przy `FORM_ENDPOINT=""` (fallback) i przy błędzie sieci (fallback `mailto:`).
