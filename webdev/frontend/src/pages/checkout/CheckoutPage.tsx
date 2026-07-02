import { useParams, Link } from 'react-router-dom';

/**
 * Checkout — placeholder pentru integrarea MAIB (se face într-o iterație ulterioară).
 * Design source: /design/checkout.png
 */
export default function CheckoutPage() {
  const { kind, slug } = useParams<{ kind: string; slug: string }>();

  return (
    <div style={{ maxWidth: 560, margin: '80px auto', padding: 24, textAlign: 'center' }} data-page="checkout">
      <Link to="/" style={{ color: '#0b3d7a', textDecoration: 'none' }}>← Înapoi la landing</Link>
      <h1 style={{ marginTop: 12 }}>💳 Plată securizată</h1>
      <p style={{ color: '#555' }}>
        Tip: <b>{kind}</b> · Element: <b>{slug}</b>
      </p>
      <div style={{ marginTop: 32, padding: 24, background: '#fff8e6', border: '1px solid #f1c40f', borderRadius: 12 }}>
        <strong>⏳ Integrare MAIB — în lucru</strong>
        <p style={{ fontSize: 14, color: '#555', marginTop: 8 }}>
          Butonul de plată va fi activat când finalizăm integrarea cu ecommerce MAIB.
        </p>
      </div>
    </div>
  );
}
