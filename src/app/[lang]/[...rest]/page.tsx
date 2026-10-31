import { notFound } from 'next/navigation';

// Eşleşmeyen adresler dilin kendi düzeni içinde 404 göstersin
export default function CatchAll() {
  notFound();
}
