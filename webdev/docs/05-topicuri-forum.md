# 05 — Topicuri de forum, unul per test

Sursă: `backend/services/sales_notify.py` + `backend/models/test.py`

Notificările de vânzări nu ajung toate la grămadă într-un singur fir. Fiecare
**test** primește propriul **topic** (subiect) în grupul echipei.

## De ce un supergrup cu Topics (forum)

Echipa rulează multe teste în paralel. Dacă toate notificările cad în același
chat, lead-urile de la teste diferite se amestecă. Soluția Telegram: un
**supergrup cu Topics activat** (modul „forum"). Atunci fiecare test are firul
lui și echipa filtrează ușor.

Cerință: **botul trebuie să fie ADMIN** în grup, cu permisiunea **„Manage
Topics"**. Fără ea, crearea de topicuri eșuează (vezi fallback).

## Cum funcționează crearea

La PRIMA notificare a unui test:

1. Backend-ul cheamă `createForumTopic` (`_create_forum_topic`), cu numele =
   numele testului (`name_ro`/`name_ru`, trunchiat la 128 caractere).
2. Reține `message_thread_id`-ul returnat în coloana `tests.tg_topic_id`.
3. Postează mesajul cu acel `message_thread_id`.

La toate notificările ULTERIOARE pentru acel test:

- `_topic_thread_id` găsește `tg_topic_id` deja salvat și postează direct în
  același topic — nu se mai creează nimic.

### Helper-e model (`models/test.py`)

- `Test.get_topic_id(test_id)` — întoarce `tg_topic_id` sau `None`.
- `Test.set_topic_id(test_id, topic_id)` — salvează id-ul topicului (overwrite
  idempotent).

## Fallback: ce se întâmplă când nu merge

Crearea de topicuri poate eșua în trei situații:

| Situație | Comportament |
|----------|--------------|
| Grupul NU e forum | Postează în firul **General** |
| Botul n-are „Manage Topics" / „not enough rights" | Postează în **General** |
| Topicul a fost șters între timp (`thread not found`) | Reîncearcă o dată în **General** |

Lead-ul ajunge MEREU în grup — fallback-ul garantează că nu se pierde, doar că
nu mai e separat pe topic.

### Flag-ul `_topics_disabled`

Dacă răspunsul de la Telegram arată că grupul nu e forum sau botul n-are
drepturi, se setează flag-ul intern de proces `_topics_disabled = True`. De
atunci, în acel proces, NU se mai încearcă deloc crearea de topicuri (toate
notificările merg direct în General). Asta evită apeluri inutile la fiecare lead.

> Pentru a reactiva topicurile după ce repari permisiunile: transformă grupul în
> supergrup-forum, dă botului „Manage Topics", apoi repornește backend-ul (flag-ul
> e per-proces, se resetează la restart).
