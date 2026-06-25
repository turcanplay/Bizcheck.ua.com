# Design assets — upload area

Put design screenshots here. Anything in this folder is served at `/design/...`.

## Naming convention

Use these exact filenames so I can match them to components:

| Fișier | Pentru componenta | Ruta |
|---|---|---|
| `hero.png` | `sections/Hero.tsx` | `/` |
| `tests-section.png` | `sections/TestsShowcase.tsx` | `/` |
| `templates-section.png` | `sections/TemplatesShowcase.tsx` | `/` |
| `card-test.png` | Cardul de test (folosit în TestsShowcase) | `/` |
| `card-template.png` | Cardul de șablon (folosit în TemplatesShowcase) | `/` |
| `footer.png` | `sections/Footer.tsx` | `/` |
| `template-detail.png` | `catalog/TemplateDetailPage.tsx` | `/sablon/:slug` |
| `delivery-picker.png` | Sub-componentă: alegere Download/Email/Telegram | `/sablon/:slug` |
| `checkout.png` | `checkout/CheckoutPage.tsx` | `/plata/:kind/:slug` |
| `checkout-success.png` | `checkout/CheckoutSuccess.tsx` | `/plata/succes` |
| `checkout-failure.png` | `checkout/CheckoutFailure.tsx` | `/plata/esec` |

Adaugă fișiere suplimentare ca `hero-mobile.png`, `card-test-hover.png` etc. dacă e nevoie — le aliniez la variantele responsive / stările respective.

## Cum folosesc designul

Când încarci imaginile, voi scrie CSS + JSX aferent pentru fiecare secțiune pe baza lor. Nu atingi codul — doar încarci aici și-mi zici care sunt gata.

Dacă prefer Figma, trimite link-ul (cu permisiuni de vizualizare) în chat și sar peste folderul ăsta.
