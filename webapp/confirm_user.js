import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qvxrwbcmyrugjevgvujb.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function confirmEmail(email) {
  try {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;
    
    const userToConfirm = users.find(u => u.email === email);
    
    if (!userToConfirm) {
       console.log(`User ${email} not found.`);
       return;
    }
    
    console.log(`Found user ID: ${userToConfirm.id}`);
    
    const { data, error } = await supabase.auth.admin.updateUserById(userToConfirm.id, {
        email_confirm: true
    });
    
    if (error) {
        throw error;
    }
    
    console.log(`Successfully confirmed email for ${email}`);
  } catch (err) {
    console.error("Error confirming email:", err);
  }
}

confirmEmail('tony@panianiproducts.com');
