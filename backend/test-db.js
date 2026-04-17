const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.lmwxaxzlsnhrljwygheh:%40Ondoy2004-09-01@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
client.connect()
  .then(() => { console.log('Connected'); client.end(); })
  .catch(err => console.error('Error:', err.message));
