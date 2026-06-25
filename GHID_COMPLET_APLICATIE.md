# GHID COMPLET - BizzCheck Bot

## Descriere Generala

**BizzCheck Bot** este o aplicatie completa pentru evaluarea riscurilor de conformitate ale companiilor. Aplicatia functioneaza pe doua canale:
1. **Bot Telegram** - chestionar interactiv direct in Telegram
2. **Aplicatie Web** - interfata web cu frontend React si backend Flask

Utilizatorii completeaza un chestionar cu 25 de intrebari, grupate in 7 blocuri tematice, si primesc un raport PDF cu scoruri si recomandari. Aplicatia este bilingva (Romana / Rusa).

---

## Tehnologii Folosite

### Telegram Bot (Python)
| Tehnologie | Versiune | Scop |
|---|---|---|
| **Python** | 3.12 | Limbaj de programare principal |
| **aiogram** | 3.0+ | Framework async pentru Telegram Bot API |
| **asyncpg** | - | Driver async pentru PostgreSQL |
| **SQLAlchemy** | 2.0+ | ORM pentru baza de date |
| **ReportLab** | 4.0+ | Generare fisiere PDF |
| **matplotlib** | 3.5+ | Generare diagrame donut/pie |
| **PyPDF2** | 3.0+ | Manipulare/combinare PDF-uri |
| **asyncio** | built-in | Programare asincrona |

### Frontend Web (TypeScript/React)
| Tehnologie | Versiune | Scop |
|---|---|---|
| **React** | 19.2.0 | Framework UI (Single Page Application) |
| **TypeScript** | 5.9.3 | Limbaj cu tipare statice |
| **Vite** | 8.0.0-beta | Build tool + dev server rapid |
| **html2canvas-pro** | 2.0.2 | Captura DOM pentru export PDF |
| **jsPDF** | 4.2.0 | Generare PDF din frontend |
| **CSS** | custom | Stilizare componente |

### Backend Web (Python/Flask)
| Tehnologie | Versiune | Scop |
|---|---|---|
| **Flask** | 3.1.0 | Framework REST API |
| **PyJWT** | - | Autentificare cu JSON Web Tokens |
| **bcrypt** | - | Hashing parole |
| **flask-limiter** | - | Rate limiting pe endpoint-uri |
| **flask-cors** | - | Configurare CORS |
| **psycopg2** | - | Driver PostgreSQL (sync) |
| **Gunicorn** | - | Server WSGI pentru productie |

### Baza de Date & DevOps
| Tehnologie | Versiune | Scop |
|---|---|---|
| **PostgreSQL** | 16 Alpine | Baza de date relationala |
| **Docker** | - | Containerizare servicii |
| **Docker Compose** | - | Orchestrare multi-container |
| **nginx** | - | Reverse proxy (productie) |

---

## Structura Proiectului

```
BIZZCHECK_BOT/
│
├── src/                          # === TELEGRAM BOT ===
│   ├── main.py                   # Punct de intrare - porneste botul
│   ├── configurare/
│   │   └── Token.py              # Incarca BOT_TOKEN din .env
│   ├── bd/                       # Stratul bazei de date
│   │   ├── conexiune.py          # Conexiune PostgreSQL async + pool
│   │   ├── tabele.py             # Modele ORM (8 tabele)
│   │   ├── scheme_bd.py          # Initializare schema
│   │   └── functii.py            # Operatii CRUD
│   └── bot/
│       ├── gestionari/           # Handlere (procesare mesaje)
│       │   ├── start.py          # /start → limba → domeniu → angajati
│       │   ├── intrebari.py      # Buton "Incepe testul" → prima intrebare
│       │   ├── test.py           # Procesare raspunsuri + ramificare
│       │   ├── raport.py         # Afisare raport
│       │   ├── command.py        # /help, /info, /about
│       │   └── raport_pdf/       # Generare raport
│       │       ├── calcul_scor.py    # Calcul scor per bloc
│       │       ├── diagrame.py       # Diagrame matplotlib
│       │       └── generare_pdf.py   # Asamblare PDF cu ReportLab
│       └── tastatura/            # Tastaturi Telegram (butoane)
│           ├── limba.py          # Selectie limba (RO/RU)
│           ├── testButton.py     # Optiuni raspuns
│           └── meniuButton.py    # Butoane meniu principal
│
├── webdev/                       # === APLICATIA WEB ===
│   ├── frontend/                 # React SPA
│   │   └── src/
│   │       ├── pages/            # Pagini principale
│   │       │   ├── StartPage.tsx     # Formular date utilizator
│   │       │   ├── QuizPage.tsx      # Interfata chestionar
│   │       │   ├── ReportPage.tsx    # Vizualizare rezultate
│   │       │   └── CtaPage.tsx       # Pagina Call-to-Action
│   │       ├── components/       # Componente reutilizabile
│   │       │   ├── quiz/             # QuizQuestion, QuizProgress
│   │       │   ├── report/           # BlockGrid, OverallScore, DonutChart
│   │       │   ├── layout/           # Header
│   │       │   └── ui/               # Componente UI generice
│   │       ├── context/          # State management
│   │       │   ├── QuizContext.tsx    # Stare quiz (faze, scoruri)
│   │       │   └── LanguageContext.tsx # Preferinta limba
│   │       ├── config/
│   │       │   └── api.ts            # URL baza API
│   │       ├── styles/           # Fisiere CSS
│   │       ├── utils/            # Functii ajutatoare
│   │       ├── i18n/
│   │       │   └── translations.ts   # Texte bilingve
│   │       └── types/            # Interfete TypeScript
│   │
│   ├── backend/                  # Flask REST API
│   │   ├── server.py             # Punct intrare Flask + middleware
│   │   ├── routes/               # Endpoint-uri API
│   │   │   ├── auth.py               # Autentificare
│   │   │   ├── admin.py              # Panou admin
│   │   │   ├── blocks.py             # Blocuri tematice
│   │   │   ├── questions.py          # Intrebari
│   │   │   ├── results.py            # Rezultate
│   │   │   ├── submissions.py        # Submisiuni + PDF
│   │   │   └── telegram.py           # Integrare Telegram
│   │   ├── services/             # Logica de business
│   │   ├── models/               # Modele ORM
│   │   ├── database/
│   │   │   └── db.py                 # Connection pooling
│   │   ├── middleware/           # JWT + admin verificare
│   │   └── admin-panel/          # SPA admin (servit la /admin)
│   │
│   ├── docker-compose.yml
│   ├── Dockerfile.frontend
│   └── nginx.conf                # Reverse proxy
│
├── scripts/
│   ├── load_json.py              # Incarca intrebarile in DB
│   ├── intrebari_complete.json   # 25 intrebari complete
│   └── exemplu_intrebari.json   # Intrebari exemplu
│
├── tests/                        # Teste pytest
├── docker-compose.yml            # Orchestrare Docker
├── Dockerfile                    # Imagine bot
├── schema.sql                    # Schema PostgreSQL
├── requirements.txt              # Dependinte Python (bot)
└── .env                          # Variabile de mediu (secrete)
```

---

## Baza de Date - Schema

### 8 Tabele Principale (Bot)

**1. `domenii`** - Sectoare de activitate
- id, denumire_ro, denumire_ru
- Valori: Productie, Comert, Servicii, HoReCa, IT, Agricultura, Transport, Medical, Altele

**2. `blocuri`** - 7 blocuri tematice ale chestionarului
- id, denumire_ro, denumire_ru, ordine

**3. `intrebari`** - 25 de intrebari
- id, text_ro, text_ru, bloc_id (FK), ordine
- Indexate dupa bloc si ordine

**4. `optiuni`** - Optiuni de raspuns per intrebare
- id, intrebare_id (FK), text_ro, text_ru, valoare (NUMERIC 0.00-1.00), next_intrebare_id (FK)
- `next_intrebare_id` permite ramificarea arborelui decizional

**5. `users`** - Utilizatori Telegram
- id, telegram_id, limba, domeniu_id, numar_angajati, current_intrebare_id, test_finalizat

**6. `raspunsuri`** - Raspunsurile utilizatorilor
- id, user_id (FK), intrebare_id (FK), valoare (NUMERIC)
- Constrangere UNIQUE pe (user_id, intrebare_id)

**7. `scoruri_bloc`** - Scoruri per bloc
- id, user_id (FK), bloc_id (FK), procent (NUMERIC)
- Constrangere UNIQUE pe (user_id, bloc_id)

**8. `scor_final`** - Scorul total
- id, user_id (FK UNIQUE), scor_mediu (NUMERIC 0-100)

---

## Telegram Bot - Flux Complet

### Pornire Bot (`src/main.py`)
```
1. Creeaza schema bazei de date (daca nu exista)
2. Pre-incarca arborele decizional in cache (optimizare)
3. Initializeaza aiogram Bot + Dispatcher
4. Inregistreaza 4 Router-e (handlere)
5. Porneste polling-ul (asculta mesaje de la Telegram)
```

### Fluxul Utilizatorului (pas cu pas)

```
┌──────────────────────────────────────────────────────┐
│  UTILIZATORUL TRIMITE /start                         │
│  → Se creeaza userul in DB                           │
│  → Se afiseaza butoanele de selectie limba (RO/RU)   │
└──────────────┬───────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────┐
│  SELECTIE LIMBA (callback: lang_ro / lang_ru)        │
│  → Se seteaza limba utilizatorului                   │
│  → Se reseteaza testul                               │
│  → Se afiseaza 9 domenii de activitate               │
└──────────────┬───────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────┐
│  SELECTIE DOMENIU (callback: dom_ID)                 │
│  → Se salveaza domeniul ales                         │
│  → Se cere numarul de angajati (text liber)          │
└──────────────┬───────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────┐
│  INTRODUCERE NUMAR ANGAJATI (regex: ^\d+$)           │
│  → Valideaza numarul (minim 1)                       │
│  → Salveaza numarul de angajati                      │
│  → Seteaza current_intrebare_id = 1                  │
│  → Afiseaza prima intrebare cu butoane               │
└──────────────┬───────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────┐
│  CHESTIONAR (25 intrebari cu ramificare)              │
│                                                      │
│  Pentru fiecare intrebare:                           │
│  1. Se afiseaza blocul tematic (header)              │
│  2. Se afiseaza textul intrebarii (RO sau RU)        │
│  3. Se afiseaza butoanele de raspuns (2-5 optiuni)   │
│  4. Utilizatorul apasa un buton                      │
│  5. Se salveaza raspunsul in DB (UPSERT)             │
│  6. Se verifica next_intrebare_id:                   │
│     - Daca != NULL → urmatoarea intrebare            │
│     - Daca == NULL → testul s-a terminat             │
└──────────────┬───────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────┐
│  FINALIZARE TEST                                     │
│  1. Calcul scor per bloc:                            │
│     SUM(valori_raspunsuri) / NR_intrebari * 100 = %  │
│  2. Calcul scor general:                             │
│     MEDIA(scoruri_blocuri) = 0-100%                  │
│  3. Generare diagrame (matplotlib donut charts)      │
│  4. Generare PDF (ReportLab):                        │
│     - Titlu + date companie                          │
│     - Grid diagrame (2 coloane)                      │
│     - Interpretare scoruri                           │
│     - Recomandari bazate pe nivel risc               │
│  5. Trimitere PDF catre utilizator in Telegram       │
│  6. Afisare sumar scoruri + recomandari text         │
└──────────────────────────────────────────────────────┘
```

### Comenzi Bot
| Comanda | Descriere |
|---|---|
| `/start` | Incepe chestionarul, selecteaza limba |
| `/help` | Afiseaza textul de ajutor |
| `/info` | Informatii despre aplicatie |
| `/about` | Despre BizzCheck |

### Butoane Telegram
| Buton | Actiune |
|---|---|
| `📝 Incepe testul` / `📝 Начать тест` | Porneste chestionarul |
| `📊 Raport` / `📊 Отчёт` | Vizualizeaza raportul (dupa finalizare) |
| Butoane limba/domeniu/raspuns | Inline cu callback-uri |

### Securitate Bot
- **Validare optiuni**: Verificare ca optiunea apartine intrebarii curente (previne sarituri)
- **Protectie double-click**: Se prinde `TelegramBadRequest` la editare butoane deja inlocuite
- **UPSERT**: Previne inregistrari duplicate de raspunsuri
- **Token in .env**: Nu apare niciodata in cod
- **Cache arbore decizional**: Incarcat la pornire, reduce query-urile la DB

### Performanta Bot
- **Async/await complet**: Gestioneaza 100+ utilizatori simultani
- **Connection pooling**: 50 conexiuni persistente + 100 overflow
- **WAL mode PostgreSQL**: Write-Ahead Logging
- **Commit instant per raspuns**: Fara pierdere date la crash

---

## Frontend Web - Ghid Complet

### Arhitectura
Aplicatia frontend este un **SPA (Single Page Application)** construit cu React + TypeScript, compilat cu Vite.

### Fazele Aplicatiei
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   START     │ ──► │    QUIZ     │ ──► │    CTA      │
│  (formular) │     │ (intrebari) │     │  (raport)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Pagini

**1. StartPage.tsx** - Pagina de start
- Formular cu: nume, email, telefon, date companie
- Checkbox consimtamant GDPR
- La submit: creeaza submisiune pe backend → trece la quiz

**2. QuizPage.tsx** - Pagina chestionar
- Afiseaza intrebarile una cate una
- Bara de progres (intrebare curenta / total)
- Navigare inainte/inapoi
- Butoane raspuns custom per intrebare

**3. ReportPage.tsx** - Pagina raport
- Scor general (mare, central)
- Grid 2 coloane cu diagrame donut per bloc
- Nivel de risc (bazat pe scor)
- Buton export PDF

**4. CtaPage.tsx** - Pagina Call-to-Action
- Mesaj de multumire
- Link descarcare PDF
- Buton retry (repornire test)
- Informatii contact

### State Management

**QuizContext** (`context/QuizContext.tsx`)
- Gestioneaza: faza curenta, blocul curent, intrebarea curenta, raspunsuri, date raport, submission ID
- Persistenta in SessionStorage (supravietuieste refresh-ul paginii)

**LanguageContext** (`context/LanguageContext.tsx`)
- Gestioneaza preferinta de limba (RO/RU)
- Toate textele vin din `i18n/translations.ts`

### Componente Principale

| Componenta | Locatie | Scop |
|---|---|---|
| QuizQuestion | components/quiz/ | Afiseaza o intrebare + optiuni raspuns |
| QuizProgress | components/quiz/ | Bara de progres |
| OverallScore | components/report/ | Scor final mare cu nivel risc |
| BlockGrid | components/report/ | Grid 2 coloane cu diagrame |
| DonutChart | components/report/ | Diagrama donut interactiva cu procent |
| CallToAction | components/report/ | Butoane actiune (PDF, retry, contact) |
| Header | components/layout/ | Antet pagina |

### Export PDF (Frontend)
```
1. html2canvas-pro → captureaza DOM-ul ca imagine
2. jsPDF → creeaza PDF din imagine + text
3. POST /api/submissions/<id>/pdf → trimite PDF-ul (base64) la backend
```

### Configurare Frontend
- `config/api.ts` → URL baza API (`http://localhost:4000/api` in dev)
- `vite.config.ts` → configurare build + dev server
- `tsconfig.json` → configurare TypeScript

---

## Backend Web (Flask) - Ghid Complet

### Punct de Intrare (`server.py`)
Flask-ul configureaza:
1. **CORS** - permite domeniul frontend-ului
2. **Rate Limiting** - protejaza endpoint-urile
3. **Security Headers** - X-Content-Type-Options, X-Frame-Options, CSP, HSTS
4. **Inregistrare rute** - toate blueprint-urile

### Rate Limiting
| Endpoint | Limita |
|---|---|
| Default | 200 / minut |
| Auth (login, register) | 10 / minut |
| Admin POST | 5 / minut |
| Telegram | 20 / minut |

### Endpoint-uri API Complete

#### Autentificare (`routes/auth.py`)
```
POST /api/auth/register    → Creare cont utilizator
POST /api/auth/login       → Obtinere JWT tokens (access + refresh)
POST /api/auth/refresh     → Reinnoire access token
GET  /api/auth/me          → Profil utilizator autentificat
```

#### Date Chestionar (`routes/blocks.py`, `routes/questions.py`)
```
GET /api/blocks            → Toate cele 7 blocuri (bilingv)
GET /api/questions         → Arborele complet de intrebari cu ramificare
GET /api/questions/<id>    → O singura intrebare + raspunsuri
```

#### Submisiuni (`routes/submissions.py`)
```
POST   /api/submissions            → Creare submisiune noua (nume, email, tel, consimtamant)
PATCH  /api/submissions/<id>       → Actualizare submisiune (raspunsuri, scoruri)
GET    /api/submissions/<id>       → Citire submisiune
POST   /api/submissions/<id>/pdf   → Upload PDF generat (base64)
GET    /api/submissions/<id>/pdf   → Descarcare PDF submisiune
DELETE /api/submissions/<id>       → Stergere submisiune
```

#### Rezultate (`routes/results.py`)
```
GET /api/results/<submission_id>   → Scoruri per bloc + scor general
```

#### Panou Admin (`routes/admin.py`)
```
POST /api/admin/login      → Autentificare admin (username/password din .env)
GET  /api/admin/stats       → Statistici dashboard
GET  /api/admin/users       → Lista utilizatori cu scoruri
DELETE /api/submissions     → Stergere toate submisiunile (admin only)
```

#### Integrare Telegram (`routes/telegram.py`)
```
POST /api/tg/link          → Creare deep link Telegram cu token
GET  /api/tg/auth/<token>  → Autentificare din Telegram (via deep link)
```

### Arhitectura Backend
```
Request → Middleware (CORS, Rate Limit, Headers)
       → Route (endpoint handler)
       → Service (logica de business)
       → Model/Database (operatii DB)
       → Response (JSON)
```

### Middleware
- **auth_middleware.py** - Verificare JWT token (`Authorization: Bearer <token>`)
- **admin_middleware.py** - Verificare drepturi admin

---

## Panou Admin

### Functionalitati
1. **Login** - Username + parola (configurate in .env)
2. **Dashboard** - Carduri statistici:
   - Total submisiuni / utilizatori
   - Scor mediu
   - Rata de completare %
   - Indicatori tendinta
3. **Lista Utilizatori** - Tabel cu:
   - Nume, email, telefon
   - Scoruri per bloc (7 coloane)
   - Scor general + nivel risc
   - Data submisiunii
4. **Actiuni**:
   - Vizualizare submisiune individuala
   - Descarcare raport PDF
   - Stergere submisiune
   - Export date

### Securitate Admin
- JWT token obligatoriu
- Verificare admin in middleware
- Rate limiting: 5 cereri/minut pe POST

---

## Configurare & Variabile de Mediu

### Bot (`.env` - root)
```env
BOT_TOKEN=8724617416:AAFf...          # Token-ul botului Telegram
DATABASE_URL=postgresql+asyncpg://...  # Conexiune PostgreSQL async
```

### Backend (`.env` - webdev/)
```env
DATABASE_URL=postgresql://...          # Conexiune PostgreSQL
ADMIN_USERNAME=admin                   # Username admin panel
ADMIN_PASSWORD=secure_password         # Parola admin panel
CORS_ORIGIN=http://localhost:5173     # URL frontend (dev)
NODE_ENV=development                   # development sau production
PORT=4000                              # Port server Flask
```

---

## Deployment cu Docker

### Servicii Docker Compose

**1. postgres** (Baza de date principala)
- Imagine: `postgres:16-alpine`
- Port: `5434:5432`
- Volum: `pgdata` (persistat)
- Health check activat

**2. postgres-test** (Pentru teste)
- Baza de date izolata pentru pytest
- Port: `5433:5432`

**3. bot** (Telegram Bot)
- Build din `Dockerfile`
- Depinde de: postgres (healthy)
- Comanda: `python main.py`

### Secventa Pornire
```bash
# 1. Porneste baza de date
docker-compose up -d postgres

# 2. Incarca intrebarile in DB
cd src && python ../scripts/load_json.py

# 3. Porneste botul
docker-compose up -d bot

# 4. Porneste backend-ul web
cd webdev/backend && gunicorn server:app

# 5. Porneste frontend-ul (dev)
cd webdev/frontend && npm run dev
```

### Productie
- **Gunicorn** - server WSGI pentru Flask
- **nginx** - reverse proxy (frontend + backend)
- **PostgreSQL** - connection pooling
- **Health checks** + auto-restart

---

## Logica de Scorare

### Formula
```
Scor per raspuns:  valoare optiune (0.00 - 1.00)
Scor per bloc:     SUM(valori_raspunsuri_din_bloc) / NR_intrebari_bloc * 100 = %
Scor general:      MEDIA(scoruri_toate_blocurile) = 0-100%
```

### Niveluri de Risc
| Scor | Nivel |
|---|---|
| 80-100% | Risc scazut |
| 60-79% | Risc moderat |
| 40-59% | Risc ridicat |
| 0-39% | Risc critic |

### Precizie
- Valori raspuns: `NUMERIC(5,2)` (0.00-1.00)
- Scoruri bloc: `NUMERIC(5,2)` (0-100%)
- Scor general: `NUMERIC(5,2)` (0-100%)

---

## Suport Bilingv

- Toate intrebarile au coloane `text_ro` / `text_ru`
- Toate optiunile au coloane `text_ro` / `text_ru`
- Toate blocurile au `denumire_ro` / `denumire_ru`
- Frontend-ul foloseste `LanguageContext` + `translations.ts`
- Bot-ul selecteaza textul bazat pe `user.limba`

---

## Ramificare (Decision Tree)

Chestionarul nu este liniar. Fiecare optiune de raspuns contine un `next_intrebare_id` care determina urmatoarea intrebare. Acest lucru permite:
- Intrebari diferite bazate pe raspunsul anterior
- Sarituri peste intrebari irelevante
- Trasee personalizate prin chestionar
- Cand `next_intrebare_id = NULL`, testul s-a terminat

```
Intrebare 1 → Optiunea A → Intrebare 2
            → Optiunea B → Intrebare 5  (sare la alta intrebare)
            → Optiunea C → Intrebare 3

Intrebare 2 → Optiunea A → Intrebare 3
            → Optiunea B → NULL (test finalizat)
```

---

## Generare Raport PDF (Bot Telegram)

### Pasii:
1. **calcul_scor.py** → Calculeaza procentul per bloc din baza de date
2. **diagrame.py** → Creeaza diagrame donut cu matplotlib (albastru = scor, gri = rest)
3. **generare_pdf.py** → Asambleaza PDF-ul cu ReportLab:
   - Titlu + informatii companie
   - Grid diagrame (2 coloane)
   - Interpretare scoruri per bloc
   - Recomandari bazate pe nivel de risc
4. **Bot** → Trimite PDF-ul catre utilizator prin Telegram (`FSInputFile`)

---

## Rezumat Arhitectura Completa

```
┌─────────────────────────────────────────────────────────┐
│                    UTILIZATOR                           │
│              ┌──────────┬──────────┐                    │
│              │ Telegram │   Web    │                    │
│              │   App    │ Browser  │                    │
│              └────┬─────┴────┬─────┘                    │
│                   │          │                           │
│    ┌──────────────▼──┐   ┌──▼──────────────┐           │
│    │  TELEGRAM BOT   │   │   FRONTEND      │           │
│    │  (aiogram/Py)   │   │   (React/TS)    │           │
│    │  Port: polling  │   │   Port: 5173    │           │
│    └──────────┬──────┘   └──────┬──────────┘           │
│               │                 │                       │
│               │          ┌──────▼──────────┐           │
│               │          │   BACKEND       │           │
│               │          │   (Flask/Py)    │           │
│               │          │   Port: 4000    │           │
│               │          └──────┬──────────┘           │
│               │                 │                       │
│        ┌──────▼─────────────────▼──────────┐           │
│        │        POSTGRESQL 16              │           │
│        │        Port: 5434                 │           │
│        └───────────────────────────────────┘           │
│                                                         │
│    ┌───────────────────────────────────────┐           │
│    │        ADMIN PANEL                    │           │
│    │    (servit de Flask la /admin)        │           │
│    └───────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```
