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
          <h1 className="title">🌴 Agencia de Viajes Beach Camp</h1>
          {children}
        </main>
      </body>
    </html>
  );
}
