/**
 * Apply database schema fixes to Supabase
 * This script adds the missing soft delete columns
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyDatabaseSchemaFix() {
  console.log('🔧 Applying Database Schema Fix');
  console.log('================================');
  console.log(`Time: ${new Date().toLocaleString()}`);

  try {
    // Login as test user to get proper permissions
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'user01@gmail.com',
      password: 'user01'
    });

    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
      return false;
    }

    console.log('✅ Logged in as:', loginData.user.email);

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'database', 'add_soft_delete_columns.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 Read SQL file:', sqlFilePath);

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.toLowerCase().includes('select ')) {
        // Skip SELECT statements (status messages)
        console.log(`⏭️  Skipping SELECT statement ${i + 1}`);
        continue;
      }

      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
      console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (err) {
        // Try alternative approach for DDL statements
        console.log(`🔄 Trying alternative approach for statement ${i + 1}...`);
        
        try {
          // For ALTER TABLE statements, we'll need to use a different approach
          if (statement.toLowerCase().includes('alter table')) {
            console.log(`⚠️  ALTER TABLE statement detected - may need manual execution in Supabase dashboard`);
            console.log(`   Statement: ${statement}`);
            errorCount++;
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, err.message);
            errorCount++;
          }
        } catch (err2) {
          console.error(`❌ Statement ${i + 1} failed completely:`, err2.message);
          errorCount++;
        }
      }

      // Small delay between statements
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Schema Fix Results:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📝 Total statements: ${statements.length}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. You may need to execute them manually in the Supabase dashboard:');
      console.log('   1. Go to https://supabase.com/dashboard');
      console.log('   2. Select your project');
      console.log('   3. Go to SQL Editor');
      console.log('   4. Execute the failed statements manually');
    }

    // Test if the columns were added successfully
    console.log('\n🧪 Testing if columns were added...');
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('transactions')
        .select('id, is_deleted, deleted_at')
        .limit(1);

      if (testError) {
        console.log('❌ Soft delete columns not yet available:', testError.message);
        return false;
      } else {
        console.log('✅ Soft delete columns are now available!');
        return true;
      }
    } catch (testErr) {
      console.log('❌ Error testing columns:', testErr.message);
      return false;
    }

  } catch (error) {
    console.error('💥 Schema fix failed:', error.message);
    return false;
  }
}

// Run the schema fix
if (require.main === module) {
  applyDatabaseSchemaFix().then(success => {
    if (success) {
      console.log('\n🎉 Database schema fix completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Database schema fix completed with issues. Manual intervention may be required.');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Schema fix execution failed:', error);
    process.exit(1);
  });
}

module.exports = { applyDatabaseSchemaFix };
