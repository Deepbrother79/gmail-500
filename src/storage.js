import { createClient } from '@supabase/supabase-js';

/**
 * Salva dati estratti su Supabase
 * @param {Object} data - Dati da salvare
 * @param {Object} env - Environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)
 * @returns {Promise<{success: boolean}>}
 */
export async function saveToSupabase(data, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase credentials not configured. Run: wrangler secret put SUPABASE_URL');
  }

  console.log('Connecting to Supabase...');
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  try {
    const record = {
      price: data.price,
      count: data.count,
      timestamp: data.timestamp,
      created_at: new Date().toISOString(),
    };

    console.log('Inserting record:', record);

    const { data: insertedData, error } = await supabase
      .from('gmail500_products')
      .insert([record])
      .select();

    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    console.log('Data saved to Supabase successfully:', insertedData);
    return { success: true, data: insertedData };

  } catch (error) {
    console.error('Failed to save to Supabase:', error.message);
    throw error;
  }
}
