export default function Custom404() {
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
        <h1 style={{ fontSize: '4rem', color: '#00ffff', marginBottom: '20px' }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', color: '#666', marginBottom: '20px' }}>
          LOCATION UNMAPPED
        </h2>
        <p style={{ color: '#999', marginBottom: '30px' }}>
          THE REQUESTED COORDINATES DO NOT EXIST IN THE DATABASE
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            background: '#00ffff',
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
