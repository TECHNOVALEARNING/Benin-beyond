import { createClient } from '@supabase/supabase-js';
import { INITIAL_LISTINGS } from './src/data/initialListings.js';
import fs from 'fs';
import path from 'path';

// Load .env manually if process.env is empty
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        val = val.trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
} catch (e) {
  // Ignore
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bgezpyfpouayqadqtycj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_So5qnzgC-c3IdAxCmv7qog_gkIrWIuw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log(`Insertion des ${INITIAL_LISTINGS.length} annonces initiales dans Supabase...`);

  for (const item of INITIAL_LISTINGS) {
    const payload = {
      id: item.id,
      title: item.title,
      type: item.type,
      subcategory: item.subcategory || (item.type === 'drive' ? 'car' : 'villa'),
      location: item.location,
      price: item.price,
      price_unit: item.price_unit,
      specs: item.specs || [],
      amenities: item.amenities || [],
      gallery: item.gallery || [],
      summary: item.summary || '',
      description: item.description || '',
      badge: item.badge || null,
      featured: Boolean(item.featured),
      rating: item.rating || 5.0,
      reviews_count: item.reviews_count || 1,
      status: item.status || 'active',
      created_date: item.created_date || new Date().toISOString()
    };

    const { error } = await supabase
      .from('listings')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error(`Erreur pour "${item.title}":`, error.message);
    } else {
      console.log(`✓ Annonce synchronisée : ${item.title}`);
    }
  }

  console.log("Seeding terminé !");
}

seed().catch(console.error);
