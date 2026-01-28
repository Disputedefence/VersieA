import { createClient } from '@supabase/supabase-js';

// Vervang deze met JOUW Supabase credentials!
const supabaseUrl = 'https://hxogortplqcufrsmkavq.supabase.co';
const supabaseAnonKey = 'sb_publishable_fK7kqiM1uM4c6lJUOjy75w_Jb_DToCt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
