import '../globals.css';

export const metadata = {
  title: 'Sabay Luk POS • អេក្រង់ភ្ញៀវ (Customer Display)',
  description: 'អេក្រង់បង្ហាញតម្លៃ និងបញ្ជីទំនិញសម្រាប់អតិថិជន Live Realtime',
};

export default function PosDisplayLayout({ children }) {
  return (
    <div className="antialiased min-h-screen bg-slate-50 font-sans">
      {children}
    </div>
  );
}
