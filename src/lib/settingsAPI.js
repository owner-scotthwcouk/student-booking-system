import { supabase } from './supabaseClient'

export async function getSystemSetting(key) {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .single()
  
  return { data, error }
}

export async function updateSystemSetting(key, value) {
  const { data, error } = await supabase
    .from('system_settings')
    .update({ value: String(value) })
    .eq('key', key)
    .select()
  
  return { data, error }
}
