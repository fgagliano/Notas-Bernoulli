import "./globals.css";


export const metadata = {
  title: "Notas Bernoulli",
  description: "Controle de notas escolares"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
