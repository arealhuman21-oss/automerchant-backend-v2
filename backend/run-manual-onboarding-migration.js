const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  try {
    console.log('🔧 Adding wants_manual_onboarding column...');

    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS wants_manual_onboarding BOOLEAN DEFAULT FALSE;

        CREATE INDEX IF NOT EXISTS idx_users_manual_onboarding
        ON users(wants_manual_onboarding)
        WHERE wants_manual_onboarding = TRUE;
      `
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

runMigration();
