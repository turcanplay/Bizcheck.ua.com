# BIZZCHECK_BOT# GHID 

## Cuprins

1. [Arhitectura proiectului](#1-arhitectura-proiectului)
2. [Baza de date — SQLAlchemy + SQLite](#2-baza-de-date)
3. [Conexiunea la BD — conexiune.py](#3-conexiunea-la-bd)
4. [Modelele ORM — tabele.py](#4-modelele-orm)
5. [Functiile CRUD — functii.py](#5-functiile-crud)
6. [Botul Telegram — aiogram](#6-botul-telegram)
7. [Handlere — cum raspunde botul](#7-handlere)
8. [Tastaturi — butoanele din Telegram](#8-tastaturi)
9. [Arborele decizional — logica intrebarilor](#9-arborele-decizional)
10. [Raportul PDF — generare diagrame si PDF](#10-raportul-pdf)
11. [Performanta si securitate](#11-performanta-si-securitate)
12. [Concepte Python importante](#12-concepte-python)


---

## 1. Arhitectura proiectului

```
src/
├── main.py                          # Punctul de pornire (ruleaza botul)
├── configurare/
│   └── Token.py                     # Tokenul botului Telegram
├── bd_sqlite/                       # Tot ce tine de baza de date
│   ├── conexiune.py                 # Configurarea conexiunii SQLite
│   ├── tabele.py                    # Modelele ORM (structura tabelelor)
│   ├── scheme_bd.py                 # Crearea tabelelor
│   └── functii.py                   # Toate operatiile pe BD (CRUD)
├── bot/
│   ├── gestionari/                  # Handlerele (raspund la mesaje/butoane)
│   │   ├── start.py                 # /start + selectie limba
│   │   ├── intrebari.py             # Butonul "Incepe testul"
│   │   ├── test.py                  # Procesarea raspunsurilor DA/NU/NU_STIU
│   │   ├── raport.py                # Finalizare test + raport text
│   │   ├── command.py               # /help, /about
│   │   └── Raport PDF/              # Generarea raportului PDF
│   │       ├── calcul_scor.py       # Calculul scorurilor
│   │       ├── diagrame.py          # Pie charts cu matplotlib
│   │       └── generare_pdf.py      # Crearea fisierului PDF
│   └── tastatura/                   # Butoanele (keyboards)
│       ├── limba.py                 # Butoane RO / RU
│       ├── testButton.py            # Butoane DA / NU / NU_STIU
│       └── meniuButton.py           # Meniul principal
└── logica/                          # (pentru viitor)
    ├── state.py
    └── scorul.py
```

### Cum circula datele:

```
Telegram → aiogram → Router → Handler → functii.py → SQLAlchemy → SQLite
                                                         ↓
Telegram ← aiogram ← Mesaj + Tastatura ← Handler ← Rezultat BD
```

---

## 2. Baza de date

### Ce este SQLite?
SQLite este o baza de date care se stocheaza intr-un singur fisier (TELEGRAM_BOT.db).
Nu necesita server separat (ca MySQL sau PostgreSQL).

### Ce este SQLAlchemy?
SQLAlchemy este o librarie Python care iti permite sa lucrezi cu baza de date
folosind clase Python in loc de SQL pur. Se numeste ORM (Object-Relational Mapping).

**Exemplu fara ORM (SQL pur):**
```python
cursor.execute("INSERT INTO users (telegram_id, username) VALUES (?, ?)", (123, "ion"))
```

**Exemplu cu ORM (SQLAlchemy):**
```python
user = User(telegram_id=123, username="ion")
session.add(user)
await session.commit()
```

### Ce este async/await?
Async permite executarea mai multor operatii simultan fara a bloca programul.

**Fara async (blocant):**
```python
# Daca 10 useri trimit mesaj simultan, fiecare asteapta pe celelalte
result = get_user(123)      # blocheaza 100ms
question = get_question(1)  # asteapta sa termine primul, apoi 100ms
# Total: 200ms
```

**Cu async (non-blocant):**
```python
# Toate ruleaza simultan
result = await get_user(123)      # trimite cererea, nu blocheaza
question = await get_question(1)  # poate rula in paralel
# Total: ~100ms (ambele ruleaza simultan)
```

---

## 3. Conexiunea la BD

**Fisier: `bd_sqlite/conexiune.py`**

```python
from sqlalchemy import create_async_engine, async_sessionmaker, event
```
- `create_async_engine` — creeaza "motorul" care comunica cu BD (versiunea async)
- `async_sessionmaker` — fabrica de sesiuni (fiecare operatie BD deschide o sesiune)
- `event` — permite adaugarea de actiuni la evenimente (ex: la conectare)

```python
DATABASE_URL = "sqlite+aiosqlite:///./TELEGRAM_BOT.db"
```
- `sqlite` = tipul bazei de date
- `aiosqlite` = driver-ul async (permite await)
- `///./TELEGRAM_BOT.db` = calea fisierului (3 slash-uri = cale relativa)

```python
engine = create_async_engine(
    DATABASE_URL,
    echo=False,         # True = logheaza fiecare query SQL (util pt debug)
    pool_pre_ping=True,  # verifica conexiunea inainte de fiecare query
)
```

### PRAGMA SQLite — De ce sunt importante:

```python
cursor.execute("PRAGMA journal_mode=WAL")
```
**WAL (Write-Ahead Logging)** — Cea mai importanta setare pentru performanta!

Fara WAL:
```
User A scrie → BD BLOCATA → User B asteapta → User C asteapta
```

Cu WAL:
```
User A scrie → User B citeste simultan → User C citeste simultan
```

```python
cursor.execute("PRAGMA busy_timeout=5000")
```
Daca BD e blocata, asteapta 5000ms (5 secunde) inainte sa dea eroare.
Fara asta: eroare instant "database is locked".

```python
cursor.execute("PRAGMA synchronous=NORMAL")
```
Echilibru intre viteza si siguranta:
- `FULL` = cel mai sigur, dar lent (scrie pe disc dupa fiecare operatie)
- `NORMAL` = rapid si suficient de sigur (recomandat)
- `OFF` = foarte rapid, dar risc de pierdere date la crash

### Sesiunea — cum functioneaza:

```python
async_session = async_sessionmaker(engine, expire_on_commit=False)
```

**Ce este o sesiune?**
O sesiune este o "conversatie" cu baza de date. Deschizi, faci operatii, inchizi.

```python
# Pattern-ul folosit peste tot in cod:
async with async_session() as session:
    # Deschide sesiunea automat
    result = await session.execute(select(User))
    # Inchide sesiunea automat la iesirea din "with"
```

`expire_on_commit=False` = dupa commit, obiectele raman accesibile.
Fara asta, dupa commit nu ai putea accesa user.username (ar da eroare).

---

## 4. Modelele ORM

**Fisier: `bd_sqlite/tabele.py`**

### Ce este un Model ORM?

Un model = o clasa Python care reprezinta o tabela din BD.
Fiecare atribut al clasei = o coloana in tabela.

```python
class User(Base):
    __tablename__ = "users"  # numele tabelei in BD

    id: Mapped[int] = mapped_column(primary_key=True)
```

| Python                  | SQL echivalent                    |
|-------------------------|-----------------------------------|
| `class User(Base)`      | `CREATE TABLE users`              |
| `id: Mapped[int]`       | `id INTEGER`                      |
| `primary_key=True`      | `PRIMARY KEY`                     |
| `unique=True`           | `UNIQUE`                          |
| `nullable=False`        | `NOT NULL`                        |
| `ForeignKey("users.id")`| `FOREIGN KEY REFERENCES users(id)`|
| `default=0`             | `DEFAULT 0`                       |

### Tipurile de date:

| SQLAlchemy  | Python    | Exemplu           |
|-------------|-----------|-------------------|
| `Integer`   | `int`     | 1, 42, 100        |
| `String(50)`| `str`     | "ion" (max 50 car)|
| `Boolean`   | `bool`    | True / False       |
| `BigInteger`| `int`     | numere foarte mari |

### Mapped[str | None] — ce inseamna?

```python
username: Mapped[str | None] = mapped_column(String(50))
```
- `Mapped[str]` = coloana obligatorie (NOT NULL)
- `Mapped[str | None]` = coloana optionala (poate fi NULL)
- `|` este "sau" in Python — `str | None` = string sau nimic

### Foreign Key — relatii intre tabele:

```python
user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
```
Asta inseamna: "aceasta coloana contine un ID care TREBUIE sa existe in tabela users".

Exemplu practic:
```
Tabela users:     id=1, username="ion"
Tabela raspunsuri: user_id=1  ← refera userul "ion"
Tabela raspunsuri: user_id=99 ← EROARE! Nu exista user cu id=99
```

### Arborele decizional — tabela Optiune:

```python
class Optiune(Base):
    intrebare_id: Mapped[int] = mapped_column(ForeignKey("intrebari.id"))
    tip_raspuns: Mapped[str] = mapped_column(String(10))  # "DA"/"NU"/"NU_STIU"
    next_intrebare_id: Mapped[int | None]  # NULL = ultima intrebare
```

Exemplu in BD:
```
Intrebare id=1: "Aveti plan de afaceri?"
  Optiune id=1: tip="DA",      next_intrebare_id=2  → mergi la intrebarea 2
  Optiune id=2: tip="NU",      next_intrebare_id=5  → mergi la intrebarea 5
  Optiune id=3: tip="NU_STIU", next_intrebare_id=5  → mergi la intrebarea 5

Intrebare id=2: "Planul include proiectii financiare?"
  Optiune id=4: tip="DA",      next_intrebare_id=3
  Optiune id=5: tip="NU",      next_intrebare_id=3

Intrebare id=5: "Aveti un contabil?"
  Optiune id=10: tip="DA",     next_intrebare_id=6
  Optiune id=11: tip="NU",     next_intrebare_id=NULL  ← ULTIMUL! Test terminat.
```

---

## 5. Functiile CRUD

**Fisier: `bd_sqlite/functii.py`**

### Ce este CRUD?
- **C**reate = creaza date noi (INSERT)
- **R**ead = citeste date (SELECT)
- **U**pdate = actualizeaza date (UPDATE)
- **D**elete = sterge date (DELETE)

### Pattern-ul de baza:

```python
async def functie_oarecare():
    async with async_session() as session:
        # 1. Construim query-ul
        stmt = select(User).where(User.telegram_id == 123)

        # 2. Executam query-ul
        result = await session.execute(stmt)

        # 3. Extragem rezultatul
        user = result.scalar_one_or_none()

        # 4. (optional) Commit daca am modificat ceva
        await session.commit()

        return user
```

### Tipuri de rezultate:

```python
result.scalar_one_or_none()  # Un singur obiect sau None
result.scalar_one()          # Un singur obiect (eroare daca nu exista!)
result.scalars().all()       # Lista de obiecte
result.all()                 # Lista de tupluri (pentru select cu mai multe coloane)
```

### SELECT — citire date:

```python
# Simplu: ia un user dupa telegram_id
select(User).where(User.telegram_id == 123)

# Cu ordonare si limita
select(Intrebare).where(Intrebare.language == "ro").order_by(Intrebare.id.asc()).limit(1)

# Cu join (combinam 2 tabele)
select(Intrebare.categorie, func.sum(Raspuns.puncte_acordate))
    .select_from(Raspuns)
    .join(Intrebare, Intrebare.id == Raspuns.intrebare_id)
    .where(Raspuns.user_id == 1)
    .group_by(Intrebare.categorie)
```

### INSERT — creare date:

```python
user = User(telegram_id=123, username="ion")
session.add(user)
await session.commit()
```

### UPDATE — actualizare date:

```python
# Metoda 1: prin query direct
await session.execute(
    update(User)
    .where(User.id == 1)
    .values(score=100, test_completed=True)
)

# Metoda 2: prin obiect (daca il ai deja incarcat)
user = result.scalar_one()
user.score = 100
user.test_completed = True
await session.commit()
```

### DELETE — stergere date:

```python
await session.execute(
    delete(Raspuns).where(Raspuns.user_id == 1)
)
await session.commit()
```

### Upsert — Insert sau Update (pattern important):

```python
# Verificam daca exista
existing = result.scalar_one_or_none()

if existing:
    # Actualizam
    existing.puncte_acordate = 5
else:
    # Cream nou
    session.add(Raspuns(user_id=1, intrebare_id=1, puncte_acordate=5))

await session.commit()
```
Acest pattern previne duplicate in BD!

### func.sum si func.count — functii de agregare:

```python
# Sumeaza toate punctele pe categorie
func.sum(Raspuns.puncte_acordate).label("scor")

# Numara intrebarile pe categorie
func.count(Intrebare.id).label("total")
```

Echivalent SQL:
```sql
SELECT categorie, SUM(puncte_acordate) as scor FROM raspunsuri GROUP BY categorie
```

---

## 6. Botul Telegram

**Fisier: `main.py`**

### Componentele aiogram:

```python
Bot(token=TOKEN)                    # Conexiunea la Telegram (prin token)
Dispatcher(storage=MemoryStorage()) # Gestioneaza toate mesajele primite
Router()                            # Grupeaza handlere pe functionalitati
```

### Ce este un Router?
Un Router grupeaza handlere. Fiecare fisier din `gestionari/` are propriul Router.

```python
# In start.py:
router = Router()

@router.message(CommandStart())
async def start_bot(message: Message):
    ...
```

```python
# In main.py:
dp.include_router(start_bot)      # Inregistram routerul
dp.include_router(handle_answer)  # Ordinea conteaza!
```

### Ordinea routerelor:
Primul router care "potriveste" un mesaj il proceseaza.
Daca start_bot are /help SI command_router are /help,
doar primul inregistrat (start_bot) va raspunde.

---

## 7. Handlere

### Handler pentru mesaje text:

```python
@router.message(F.text.in_(["📝 Începe testul", "📝 Начать тест"]))
async def start_test(message: Message):
    await message.answer("Text raspuns")
```

- `@router.message()` = se activeaza la mesaje text
- `F.text.in_([...])` = filtru: se activeaza DOAR daca textul e in lista
- `message.answer()` = trimite raspunsul

### Handler pentru callback (butoane inline):

```python
@router.callback_query(F.data.startswith("opt_"))
async def handle_answer(callback: CallbackQuery):
    optiune_id = int(callback.data.split("_")[1])
    await callback.answer()  # Inchide "loading" pe buton
    await callback.message.answer("Raspuns")
```

- `@router.callback_query()` = se activeaza la click pe buton inline
- `F.data.startswith("opt_")` = filtru: doar callback-uri care incep cu "opt_"
- `callback.data` = textul din `callback_data` al butonului (ex: "opt_42")
- `callback.answer()` = OBLIGATORIU! Opreste animatia de loading pe buton

### Diferenta message vs callback:

```python
# Mesaj text (userul scrie sau apasa buton Reply):
@router.message(...)
async def handler(message: Message):
    await message.answer("Raspuns")

# Buton inline (butonul de sub un mesaj):
@router.callback_query(...)
async def handler(callback: CallbackQuery):
    await callback.answer()                    # Opreste loading
    await callback.message.answer("Raspuns")   # Trimite mesaj NOU
    await callback.message.edit_text("Edit")   # Editeaza mesajul EXISTENT
    await callback.message.edit_reply_markup()  # Schimba BUTOANELE
```

---

## 8. Tastaturi

### InlineKeyboardMarkup (sub mesaj, temporare):

```python
InlineKeyboardMarkup(inline_keyboard=[
    [   # Rand 1:
        InlineKeyboardButton(text="Da", callback_data="opt_1"),
        InlineKeyboardButton(text="Nu", callback_data="opt_2"),
    ],
    [   # Rand 2:
        InlineKeyboardButton(text="Nu stiu", callback_data="opt_3"),
    ]
])
```

- `text` = ce vede userul
- `callback_data` = ce primeste handler-ul (invizibil pentru user)
- Fiecare lista interioara = un rand de butoane

### ReplyKeyboardMarkup (jos, permanente):

```python
ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="📝 Începe testul")],
        [KeyboardButton(text="ℹ️ Info"), KeyboardButton(text="❓ Help")],
    ],
    resize_keyboard=True  # Butoane mai mici
)
```

Diferenta principala:
- **Inline** = sub un mesaj specific, trimit callback_data
- **Reply** = in partea de jos, trimit mesaj text

---

## 9. Arborele decizional

### Cum functioneaza navigarea:

```
1. User apasa "Incepe testul"
   → intrebari.py: get_intrebare_by_id(user.current_intrebare_id)
   → Afiseaza intrebarea + butoane DA/NU/NU_STIU

2. User apasa "DA" (callback "opt_42")
   → test.py: extrage optiune_id = 42
   → Verifica: optiune.intrebare_id == user.current_intrebare_id? (protectie)
   → save_answer(): salveaza raspunsul + calculeaza puncte
   → Returneaza optiune.next_intrebare_id

3. Daca next_intrebare_id != None:
   → Actualizeaza user.current_intrebare_id = next
   → Afiseaza intrebarea urmatoare

4. Daca next_intrebare_id == None:
   → Testul s-a terminat!
   → finalize_test(): calculeaza scor + nivel risc
   → format_report(): formateaza textul raportului
   → Afiseaza raportul in Telegram
```

### Protectii implementate:

**1. Dublu-click:**
```python
try:
    await callback.message.edit_reply_markup(reply_markup=selected_keyboard(...))
except TelegramBadRequest:
    # Butoanele deja inlocuite = al doilea click, ignoram
    return
```
Logica: `edit_reply_markup` se poate executa O SINGURA DATA pe mesaj.
La al doilea click, Telegram da eroare → o prindem → ignoram.

**2. Optiune gresita:**
```python
if user.current_intrebare_id != optiune.intrebare_id:
    return  # Userul a avansat deja, ignoram
```

**3. Upsert la raspuns:**
```python
existing = result.scalar_one_or_none()
if existing:
    existing.puncte_acordate = puncte  # Actualizeaza
else:
    session.add(Raspuns(...))          # Creeaza nou
```

---

## 10. Raportul PDF

### Fluxul complet:

```
1. calcul_scor.py: get_category_scores()
   → Query BD: SUM(puncte_acordate) / SUM(weight) * 100 per categorie
   → Returneaza: {"Fiscalitate": 75, "Juridic": 40}

2. diagrame.py: generate_charts()
   → matplotlib: creeaza pie chart (donut) pentru fiecare categorie
   → Salveaza PNG in charts/
   → Returneaza: {"Fiscalitate": "charts/Fiscalitate_ro.png"}

3. generare_pdf.py: generate_pdf()
   → ReportLab: creeaza PDF cu diagramele in tabel (2 pe rand)
   → Returneaza: "temp_report.pdf"

4. generare_pdf.py: append_existing_pdf()
   → PyPDF2: imbina designul (pdfro.pdf) + raportul generat
   → Returneaza: "BIZCHECK_RAPORT.pdf"
```

### matplotlib — Diagrame:

```python
plt.figure(figsize=(3, 3))           # Dimensiunea: 3x3 inch
plt.pie(
    [75, 25],                         # 75% bun, 25% rau
    startangle=90,                    # Incepe de sus
    colors=["#1f77ff", "#e6e6e6"],   # Albastru + gri
    wedgeprops={"width": 0.3}        # Grosimea inelului (donut)
)
plt.text(0, 0, "75%", ...)           # Textul din centru
plt.savefig("chart.png")             # Salveaza ca imagine
plt.close()                           # IMPORTANT: elibereaza memoria!
```

### ReportLab — PDF:

```python
doc = SimpleDocTemplate("raport.pdf", pagesize=A4)  # Document A4
elements = []
elements.append(Paragraph("Titlu", style))            # Text formatat
elements.append(Spacer(1, 1 * cm))                    # Spatiu gol
elements.append(Image("chart.png", 6*cm, 6*cm))       # Imagine
doc.build(elements)                                    # Construieste PDF
```

---

## 11. Performanta si securitate

### SQLite WAL Mode:
```
Fara WAL: 1 scriere blocheaza TOTUL (citiri + scrieri)
Cu WAL:   Scrierile nu blocheaza citirile (ideal pt 10-15 useri)
Limita:   O SINGURA scriere la un moment dat (SQLite nu e MySQL)
```

### Cand SQLite NU mai e suficient:
- Peste 50-100 useri SIMULTAN care scriu
- Baza de date peste 10GB
- Trebuie acces de pe mai multe servere
→ Migreaza la PostgreSQL

### Sesiuni scurte:
```python
# BUN — sesiune scurta, se inchide rapid:
async with async_session() as session:
    result = await session.execute(select(User))
    return result.scalar_one_or_none()

# RAU — sesiune deschisa prea mult:
session = async_session()
# ... 10 secunde de procesare ...
result = await session.execute(select(User))
# Sesiunea a fost deschisa inutil 10 secunde, blocand altii
```

### Commit instant:
```python
# BUN — fiecare raspuns se salveaza imediat:
await session.commit()  # Dupa fiecare save_answer()

# RAU — salvezi totul la final:
for raspuns in raspunsuri:
    session.add(raspuns)
# session.commit()  # Daca botul cade inainte, TOTUL se pierde!
```

### Pool connections:
```python
pool_pre_ping=True  # Verifica daca conexiunea e vie inainte de query
```
Fara asta: daca conexiunea "moare" (timeout), urmatorul query da eroare.

---

## 12. Concepte Python importante

### async/await:
```python
# async def = functie asincrona (poate folosi await)
async def get_user():
    result = await session.execute(...)  # await = "asteapta rezultatul"
    return result

# GRESIT: apelezi functie async fara await
user = get_user()        # Returneaza un coroutine, NU userul!

# CORECT:
user = await get_user()  # Asteapta si returneaza userul
```

### Context Manager (async with):
```python
# "with" deschide si inchide automat resursa:
async with async_session() as session:
    # session e deschisa aici
    pass
# session e inchisa automat aici (chiar daca apare eroare!)

# Echivalent manual (nu recomand):
session = async_session()
try:
    pass
finally:
    await session.close()
```

### try/except:
```python
try:
    await callback.message.edit_reply_markup(...)
except TelegramBadRequest:
    # Eroarea se prinde DOAR daca e TelegramBadRequest
    # Alte erori trec mai departe
    return
```

### Dictionary comprehension:
```python
# Transforma o lista de tupluri intr-un dict:
result.all()  # [(("Fiscal", 10), ("Juridic", 8)]

{categorie: scor for categorie, scor in result.all()}
# Rezultat: {"Fiscal": 10, "Juridic": 8}
```

### F-strings:
```python
name = "Ion"
score = 75
text = f"Salut {name}, scorul tau e {score}%"
# Rezultat: "Salut Ion, scorul tau e 75%"
```

### Type hints:
```python
async def get_user(telegram_id: int) -> User | None:
#                                  ↑ tip parametru   ↑ tip returnat
```
Type hints NU schimba comportamentul — sunt doar pentru documentare.

---

## 13. Sfaturi pentru dezvoltare

### 1. Foloseste echo=True cand faci debug:
```python
# In conexiune.py, schimba temporar:
engine = create_async_engine(DATABASE_URL, echo=True)
# Vei vedea FIECARE query SQL in terminal
```

### 2. Testeaza cu date false:
Creeaza un script care populeaza BD cu intrebari + optiuni de test.

### 3. Logheaza erorile:
```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    ...
except Exception as e:
    logger.error(f"Eroare: {e}")
```

### 4. Pastreaza sesiunile scurte:
Deschide sesiunea → fa operatia → inchide. Nu tine sesiuni deschise.

### 5. Testeaza cu mai multi useri:
Deschide botul de pe 2-3 conturi Telegram simultan si vezi daca functioneaza.

### 6. Fa backup la BD:
```bash
cp TELEGRAM_BOT.db TELEGRAM_BOT_backup.db
```

### 7. Nu pune tokenul in cod:
```python
# RAU:
TOKEN = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"

# BUN (foloseste .env):
import os
TOKEN = os.getenv("BOT_TOKEN")
```

### 8. Structura recomandata pentru viitor:
- Adauga logging in toate handlerele
- Muta textele intr-un fisier separat (internationalizare)
- Adauga FSM (Finite State Machine) pentru fluxuri complexe
- Adauga rate limiting (limitare mesaje per user)
- Migreaza la PostgreSQL cand cresti

---

## Glosar rapid

| Termen | Explicatie |
|--------|-----------|
| ORM | Object-Relational Mapping — clase Python = tabele BD |
| CRUD | Create, Read, Update, Delete — operatii de baza |
| FK | Foreign Key — referinta catre alta tabela |
| PK | Primary Key — identificator unic |
| Query | Cerere catre baza de date |
| Session | "Conversatie" cu BD (deschizi, faci operatii, inchizi) |
| Commit | Salveaza modificarile in BD (fara commit, se pierd) |
| Router | Grupeaza handlerele pe functionalitati |
| Handler | Functie care raspunde la un mesaj/buton |
| Callback | Datele trimise cand userul apasa un buton inline |
| Middleware | Cod care ruleaza INAINTE de handler (ex: verificari) |
| FSM | Finite State Machine — gestioneaza stari complexe |
| WAL | Write-Ahead Logging — mod SQLite pt scrieri simultane |
| Upsert | Update daca exista, Insert daca nu |
