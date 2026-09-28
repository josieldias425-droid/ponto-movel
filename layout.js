import './globals.css';

export const metadata = {
  title: 'Ponto Móvel',
  description: 'Painel administrativo do Ponto Móvel'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
