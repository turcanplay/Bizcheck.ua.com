# 02 — Notificarea de vânzări

**Serviciu:** `webdev/backend/services/sales_notify.py`.
**Token:** `SALES_BOT_TOKEN`. **Chat țintă:** `SALES_CHAT_ID` sau `/register` (vezi [`03`](03-bot-grup-register.md)).

Când un vizitator termină un test și lasă date de contact, se postează o notificare **text**
(fără PDF) într-un grup privat de tip forum unde stă echipa de vânzări: nume, telefon, email,
Telegram (dacă a ales livrarea în TG), ce test + scor.

## Cuprins

- [Unde e chemată](#unde-e-chemată)
- [Gating: ce e un lead complet](#gating-ce-e-un-lead-complet)
- [Trimite o singură dată (fire-once)](#trimite-o-singură-dată-fire-once)
- [Edit-in-place](#edit-in-place)
- [Worker serializat cu coadă](#worker-serializat-cu-coadă)
- [Topic-uri de forum (unul per test)](#topic-uri-de-forum-unul-per-test)
- [De ce fără PDF](#de-ce-fără-pdf)

---

## Unde e chemată

`maybe_notify_sales(submission_id)` (`sales_notify.py:546`) e chemat din 3 căi de scriere,
toate în `try/except` ca o eroare de notificare să nu strice salvarea clientului:

- `routes/submissions.py` — flux web (PATCH)
- `routes/telegram.py:262` — după `/tg/contact`
- `routes/telegram.py:360` — după `/tg/lead`

## Gating: ce e un lead complet

Notifică **doar** dacă submisia are nume **și** un canal de contact (`sales_notify.py:495-498`):

```
has_name    = first_name sau last_name
has_contact = email sau phone sau tg_chat_id
```

Altfel se iese tăcut și se așteaptă următoarea scriere.

## Trimite o singură dată (fire-once)

`Submission.claim_sales_notification` revendică atomic dreptul de a notifica (coloana
`submissions.sales_notified`). Cine **câștigă** revendicarea → prima trimitere. Cine o
**pierde** → mesajul există deja, deci se face **edit** în loc de duplicat.

Dacă trimiterea eșuează real, revendicarea se **eliberează** (`release_sales_notification`)
ca o scriere ulterioară să reîncerce în loc ca leadul să se piardă pentru totdeauna.

> Caz de colț (`_process_send`, `:386`): dacă Telegram răspunde `200` dar **fără** `message_id`,
> claim-ul se **păstrează** (ca să nu dublăm) dar update-urile in-place nu mai sunt posibile
> pentru acea submisie — se loghează un warning.

## Edit-in-place

Pe fiecare scriere ulterioară (ex. clientul lasă email/telefon în bot după livrare),
`_process_update` (`:424`) face `editMessageText` pe **același** mesaj, ca datele noi de
contact să apară fără a spama grupul cu duplicate.

## Worker serializat cu coadă

Un **singur thread daemon** golește o `queue.Queue(maxsize=2000)` (`sales_notify.py:284`,
`_worker_loop` la `:502`). Intenționat — evită un thread-per-submission storm sub un burst
de lead-uri. Job-urile poartă doar id-ul submisiei (mesajele sunt text, fără PDF), deci memoria
rămâne plată. Trimiterile sunt spațiate (`_SEND_SPACING_SEC`, default 3s) și 429-urile sunt
reîncercate (`_MAX_SEND_RETRY`, default 4).

Tipuri de job pe coadă:

| Job | Procesat de | Rol |
|---|---|---|
| `("send", sub_id)` | `_process_send` | Prima notificare |
| `("update", sub_id, msg_id, is_doc)` | `_process_update` | Edit in-place |
| `("alert", info)` | `_process_alert` (`:454`) | Alertă la eșec de livrare — vezi [`04`](04-alerta-esec-livrare.md) |

## Topic-uri de forum (unul per test)

Fiecare test primește **propriul topic**, creat automat la prima notificare (`createForumTopic`)
și memorat în `tests.tg_topic_id`. Fiecare notificare ulterioară pentru acel test intră în
același topic (`_topic_thread_id`, `:238`).

- Dacă grupul **nu** e forum (sau botul n-are „Manage Topics"), se cade pe thread-ul General
  (`_topics_disabled`).
- Dacă `SALES_TOPIC_ID` e setat, **toate** notificările intră în acel topic unic (are prioritate).
- Dacă un topic a fost șters în grup (`thread not found`), id-ul mort se curăță
  (`_forget_topic_id`) și următorul lead creează un topic nou.

## De ce fără PDF

Fișierul e lăsat intenționat afară (`sales_notify.py:9-11`) ca un burst de rapoarte grele să nu
umfle grupul sau să nu OOM-uie worker-ul. Arhiva completă de PDF-uri se trage la cerere de
botul de grup prin `/tg/exports/*` — vezi [`03-bot-grup-register.md`](03-bot-grup-register.md).
