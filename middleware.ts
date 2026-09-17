import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: { path?: string; domain?: string; expires?: Date; httpOnly?: boolean; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none'; }) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: { path?: string; domain?: string; expires?: Date; httpOnly?: boolean; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none'; }) {
          request.cookies.delete(name);
          response.cookies.delete(name);
        }
      }
    }
  );

  const { data } = await supabase.auth.getSession();

  if (request.nextUrl.pathname.startsWith('/admin') && !data.session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*']
};
