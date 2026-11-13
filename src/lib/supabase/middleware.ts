import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Skip supabase checks if environment variables are not yet configured
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/auth');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isDemo = request.nextUrl.searchParams.get('demo') === '1' ||
                 request.nextUrl.searchParams.get('preview') === '1';

  // If user is not authenticated and trying to access protected routes
  if (!user && !isAuthPage && !isApiRoute && !isDemo) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access /login, redirect to library (/)
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Strip any client-supplied user headers to prevent header spoofing / trust-boundary injection
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-user-id');
  requestHeaders.delete('x-user-email');

  if (user) {
    requestHeaders.set('x-user-id', user.id);
    if (user.email) {
      requestHeaders.set('x-user-email', user.email);
    }
  }

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Preserve any cookies set by Supabase during session refresh
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value, cookie);
  });

  return finalResponse;
}
