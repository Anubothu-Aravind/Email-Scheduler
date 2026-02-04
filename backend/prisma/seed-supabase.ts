/**
 * Seed Script using Supabase REST API
 * 
 * This script inserts sample data into your Supabase database
 * using direct HTTP requests to your API endpoints.
 * 
 * Run: npx ts-node prisma/seed-supabase.ts
 * Or:  npm run seed:supabase
 */

import { supabaseServiceClient } from '../src/config/supabase';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  console.log('🌱 Starting Supabase database seed...\n');

  try {
    // ========================================================================
    // 1. CREATE USERS
    // ========================================================================
    console.log('📝 Creating users...');

    const password1 = await bcrypt.hash('password123', 10);
    const password2 = await bcrypt.hash('password456', 10);

    // Delete existing test users (if any)
    await supabaseServiceClient
      .from('users')
      .delete()
      .in('email', ['john@example.com', 'jane@example.com']);

    // Create User 1
    const { data: user1, error: user1Error } = await supabaseServiceClient
      .from('users')
      .insert({
        email: 'john@example.com',
        password_hash: password1,
        full_name: 'John Doe',
      })
      .select()
      .single();

    if (user1Error) {
      console.error('❌ Error creating user1:', user1Error.message);
      throw user1Error;
    }
    console.log(`   ✅ Created user: ${user1.email} (ID: ${user1.id})`);

    // Create User 2
    const { data: user2, error: user2Error } = await supabaseServiceClient
      .from('users')
      .insert({
        email: 'jane@example.com',
        password_hash: password2,
        full_name: 'Jane Smith',
      })
      .select()
      .single();

    if (user2Error) {
      console.error('❌ Error creating user2:', user2Error.message);
      throw user2Error;
    }
    console.log(`   ✅ Created user: ${user2.email} (ID: ${user2.id})`);

    // ========================================================================
    // 2. CREATE SENDERS
    // ========================================================================
    console.log('\n📧 Creating senders...');

    // Create Sender 1 for User 1
    const { data: sender1, error: sender1Error } = await supabaseServiceClient
      .from('senders')
      .insert({
        user_id: user1.id,
        email: 'john.marketing@example.com',
        name: 'John Marketing',
        is_default: true,
      })
      .select()
      .single();

    if (sender1Error) {
      console.error('❌ Error creating sender1:', sender1Error.message);
      throw sender1Error;
    }
    console.log(`   ✅ Created sender: ${sender1.name} <${sender1.email}> (ID: ${sender1.id})`);

    // Create Sender 2 for User 1
    const { data: sender2, error: sender2Error } = await supabaseServiceClient
      .from('senders')
      .insert({
        user_id: user1.id,
        email: 'john.support@example.com',
        name: 'John Support',
        is_default: false,
      })
      .select()
      .single();

    if (sender2Error) {
      console.error('❌ Error creating sender2:', sender2Error.message);
      throw sender2Error;
    }
    console.log(`   ✅ Created sender: ${sender2.name} <${sender2.email}> (ID: ${sender2.id})`);

    // Create Sender 3 for User 2
    const { data: sender3, error: sender3Error } = await supabaseServiceClient
      .from('senders')
      .insert({
        user_id: user2.id,
        email: 'jane.newsletter@example.com',
        name: 'Jane Newsletter',
        is_default: true,
      })
      .select()
      .single();

    if (sender3Error) {
      console.error('❌ Error creating sender3:', sender3Error.message);
      throw sender3Error;
    }
    console.log(`   ✅ Created sender: ${sender3.name} <${sender3.email}> (ID: ${sender3.id})`);

    // ========================================================================
    // 3. CREATE SCHEDULED EMAILS
    // ========================================================================
    console.log('\n📬 Creating scheduled emails...');

    const now = new Date();
    const inFiveMinutes = new Date(now.getTime() + 5 * 60 * 1000);
    const inTenMinutes = new Date(now.getTime() + 10 * 60 * 1000);
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Email 1 - Pending
    const { data: email1, error: email1Error } = await supabaseServiceClient
      .from('emails')
      .insert({
        user_id: user1.id,
        sender_id: sender1.id,
        recipient_email: 'alice@example.com',
        subject: 'Welcome to Our Service!',
        body: 'Hello Alice, welcome to our service. We are excited to have you on board!',
        scheduled_time: inFiveMinutes.toISOString(),
        status: 'pending',
        idempotency_key: 'sample-email-1',
      })
      .select()
      .single();

    if (email1Error) {
      console.error('❌ Error creating email1:', email1Error.message);
      throw email1Error;
    }
    console.log(`   ✅ Created email: "${email1.subject}" to ${email1.recipient_email} (Status: ${email1.status})`);

    // Email 2 - Scheduled
    const { data: email2, error: email2Error } = await supabaseServiceClient
      .from('emails')
      .insert({
        user_id: user1.id,
        sender_id: sender2.id,
        recipient_email: 'bob@example.com',
        subject: 'Your Order Confirmation #12345',
        body: 'Hi Bob, your order #12345 has been confirmed and will be shipped soon.',
        scheduled_time: inTenMinutes.toISOString(),
        status: 'scheduled',
        idempotency_key: 'sample-email-2',
      })
      .select()
      .single();

    if (email2Error) {
      console.error('❌ Error creating email2:', email2Error.message);
      throw email2Error;
    }
    console.log(`   ✅ Created email: "${email2.subject}" to ${email2.recipient_email} (Status: ${email2.status})`);

    // Email 3 - Sent (past email)
    const { data: email3, error: email3Error } = await supabaseServiceClient
      .from('emails')
      .insert({
        user_id: user2.id,
        sender_id: sender3.id,
        recipient_email: 'charlie@example.com',
        subject: 'Monthly Newsletter - January 2026',
        body: 'Hello Charlie, here is your monthly newsletter with the latest updates!',
        scheduled_time: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        status: 'sent',
        sent_at: new Date(now.getTime() - 59 * 60 * 1000).toISOString(),
        idempotency_key: 'sample-email-3',
      })
      .select()
      .single();

    if (email3Error) {
      console.error('❌ Error creating email3:', email3Error.message);
      throw email3Error;
    }
    console.log(`   ✅ Created email: "${email3.subject}" to ${email3.recipient_email} (Status: ${email3.status})`);

    // Email 4 - Failed
    const { data: email4, error: email4Error } = await supabaseServiceClient
      .from('emails')
      .insert({
        user_id: user1.id,
        sender_id: sender1.id,
        recipient_email: 'invalid-email@nonexistent-domain.xyz',
        subject: 'Test Email - Failed',
        body: 'This email was supposed to fail for testing purposes.',
        scheduled_time: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 mins ago
        status: 'failed',
        error_message: 'Failed to send: Domain does not exist',
        idempotency_key: 'sample-email-4',
      })
      .select()
      .single();

    if (email4Error) {
      console.error('❌ Error creating email4:', email4Error.message);
      throw email4Error;
    }
    console.log(`   ✅ Created email: "${email4.subject}" to ${email4.recipient_email} (Status: ${email4.status})`);

    // Email 5 - Future scheduled
    const { data: email5, error: email5Error } = await supabaseServiceClient
      .from('emails')
      .insert({
        user_id: user2.id,
        sender_id: sender3.id,
        recipient_email: 'david@example.com',
        subject: 'Upcoming Event Reminder',
        body: 'Hi David, this is a reminder about the upcoming event tomorrow!',
        scheduled_time: inOneDay.toISOString(),
        status: 'pending',
        idempotency_key: 'sample-email-5',
      })
      .select()
      .single();

    if (email5Error) {
      console.error('❌ Error creating email5:', email5Error.message);
      throw email5Error;
    }
    console.log(`   ✅ Created email: "${email5.subject}" to ${email5.recipient_email} (Status: ${email5.status})`);

    // ========================================================================
    // 4. CREATE EMAIL LOGS
    // ========================================================================
    console.log('\n📋 Creating email logs...');

    // Log for sent email
    const { data: log1, error: log1Error } = await supabaseServiceClient
      .from('email_logs')
      .insert({
        email_id: email3.id,
        status: 'sent',
        message: 'Email delivered successfully',
        attempted_at: email3.sent_at,
      })
      .select()
      .single();

    if (log1Error) {
      console.error('❌ Error creating log1:', log1Error.message);
      throw log1Error;
    }
    console.log(`   ✅ Created log for email ${email3.id}: ${log1.status}`);

    // Logs for failed email (multiple attempts)
    const { data: log2, error: log2Error } = await supabaseServiceClient
      .from('email_logs')
      .insert({
        email_id: email4.id,
        status: 'failed',
        message: 'Attempt 1: Connection timeout',
        attempted_at: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (log2Error) {
      console.error('❌ Error creating log2:', log2Error.message);
      throw log2Error;
    }
    console.log(`   ✅ Created log for email ${email4.id}: ${log2.status} (Attempt 1)`);

    const { data: log3, error: log3Error } = await supabaseServiceClient
      .from('email_logs')
      .insert({
        email_id: email4.id,
        status: 'failed',
        message: 'Attempt 2: Domain does not exist',
        attempted_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (log3Error) {
      console.error('❌ Error creating log3:', log3Error.message);
      throw log3Error;
    }
    console.log(`   ✅ Created log for email ${email4.id}: ${log3.status} (Attempt 2)`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Database seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log('   • Users created: 2');
    console.log('   • Senders created: 3');
    console.log('   • Emails created: 5');
    console.log('   • Email logs created: 3');
    console.log('\n🔑 Test Credentials:');
    console.log('   User 1: john@example.com / password123');
    console.log('   User 2: jane@example.com / password456');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
