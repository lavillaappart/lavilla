import Image from 'next/image';
import Link from 'next/link';
import logo from '@/app/images/logo.png';

export default function Brand({ href = '/', admin = false }: { href?: string; admin?: boolean }) {
  return (
    <Link className={`brand ${admin ? 'brand-admin' : ''}`} href={href} aria-label={admin ? 'La Villa Admin' : 'La Villa'}>
      <span className="brand-logo-frame"><Image src={logo} alt="La Villa Appart Al Hoceima" priority /></span>
    </Link>
  );
}
