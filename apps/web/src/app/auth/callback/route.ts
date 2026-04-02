import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnedState = searchParams.get('state');
  const storedState = cookies().get('oauth_state')?.value;

  if (!storedState || !returnedState || storedState !== returnedState) {
    console.error('OAuth state mismatch - possible CSRF attack');
    redirect('/?error=csrf_failed');
  }

  cookies().delete('oauth_state');

  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error('Auth callback error:', error);
    redirect('/?error=auth_failed');
  }

  const { error: profileError } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      spoiler_free: false,
      notifications_enabled: true,
      timezone: 'UTC',
    }, {
      onConflict: 'user_id',
    });

  if (profileError) {
    console.error('Profile creation error:', profileError);
  }

  redirect('/');
}
