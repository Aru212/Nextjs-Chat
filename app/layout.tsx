import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Chat",
  description: "A real-time multi-user chat application",
  icons: {
    icon: '/icon.png',  
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-theme="dark">
      <head>
        <script
          // Runs before paint so switching themes never causes a flash of the wrong colors.
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('chat-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}