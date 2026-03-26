import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default async function AuthCallback() {
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
