const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// User Database (nexus-db)
const userDbUrl = process.env.USER_DB_URL;
const userDbKey = process.env.USER_DB_SERVICE_ROLE_KEY;

// Host Database (nexus-host-db)
const hostDbUrl = process.env.HOST_DB_URL;
const hostDbKey = process.env.HOST_DB_SERVICE_ROLE_KEY;

let userDb, hostDb;

if (userDbUrl && userDbKey) {
  userDb = createClient(userDbUrl, userDbKey);
  console.log('Nexus User DB connected via Supabase client');
} else {
  console.warn('Nexus User DB URL or Key is missing in environment variables.');
}

if (hostDbUrl && hostDbKey) {
  hostDb = createClient(hostDbUrl, hostDbKey);
  console.log('Nexus Host DB connected via Supabase client');
} else {
  console.warn('Nexus Host DB URL or Key is missing in environment variables.');
}

module.exports = {
  userDb,
  hostDb
};
