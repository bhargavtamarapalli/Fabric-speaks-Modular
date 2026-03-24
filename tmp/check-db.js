const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres:fmcpck6fzg%40@db.obgtnlqdkgnnwbmzehei.supabase.co:5432/postgres",
});
client.connect()
  .then(() => {
    console.log('Connected successfully');
    return client.query('SELECT NOW()');
  })
  .then(res => {
    console.log('Query result:', res.rows[0]);
    return client.end();
  })
  .catch(err => {
    console.error('Connection error', err.stack);
    process.exit(1);
  });
