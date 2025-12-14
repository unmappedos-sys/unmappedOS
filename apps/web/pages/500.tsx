export default function Custom500() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '500px', padding: '20px' }}>
        <h1 style={{ fontSize: '4rem', color: '#ff0000', marginBottom: '20px' }}>500</h1>
        <h2 style={{ fontSize: '1.5rem', color: '#666', marginBottom: '20px' }}>SYSTEM ERROR</h2>
        <p style={{ color: '#999', marginBottom: '30px' }}>
          INTERNAL SERVER ERROR - CONTACT SUPPORT IF THIS PERSISTS
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            background: '#ff0000',
            color: '#000',
            padding: '12px 24px',
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          RETURN TO BASE
        </a>
      </div>
    </div>
  );
}
