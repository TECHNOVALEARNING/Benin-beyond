import { createClient } from '@supabase/supabase-js';
import { INITIAL_LISTINGS } from './src/data/initialListings.js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Veuillez définir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans votre fichier .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Insertion des 8 annonces initiales dans Supabase...");

  for (const item of INITIAL_LISTINGS) {
    const { data, error } = await supabase
      .from('listings')
      .upsert(item, { onConflict: 'id' });

    if (error) {
      console.error(`Erreur pour "${item.title}":`, error.message);
    } else {
      console.log(`✓ Annonce insérée : ${item.title}`);
    }
  }

  console.log("Seeding terminé avec succès !");
}

seed().catch(console.error);
