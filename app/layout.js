import './globals.css';

export const metadata = {
  title: 'Training Attendance',
  description: 'QR-based attendance for in-person trainings',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
