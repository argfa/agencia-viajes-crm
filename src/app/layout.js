import "./globals.css";

export const metadata = {
  title: "Agencia de Viajes Beach Camp",
  description: "Sistema de gestión de reservas de playa, campo y montaña",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <main className="app-container">
          <div style={{
            position: 'fixed',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80vw',
            height: '80vh',
            backgroundImage: "url('/logo.png')",
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.35,
            zIndex: -1,
            mixBlendMode: 'multiply'
          }}></div>
          {children}
        </main>
      </body>
    </html>
  );
}
