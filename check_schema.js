require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const userDbUrl = process.env.USER_DB_URL;
const userDbKey = process.env.USER_DB_SERVICE_ROLE_KEY;
const hostDbUrl = process.env.HOST_DB_URL;
const hostDbKey = process.env.HOST_DB_SERVICE_ROLE_KEY;
const userDb = createClient(userDbUrl, userDbKey);
const hostDb = createClient(hostDbUrl, hostDbKey);
async function check() {
    console.log("--- USER DB ---");
    const { data: users, error: uErr } = await userDb.from('users').select('*').limit(1);
    console.log("Users:", users ? users[0] : uErr);
    
    const { data: bookings, error: bErr } = await userDb.from('nexus_bookings').select('*').limit(1);
    console.log("Bookings:", bookings ? bookings[0] : bErr);

    console.log("--- HOST DB ---");
    const { data: hosts, error: hErr } = await hostDb.from('hosts').select('*').limit(1);
    console.log("Hosts:", hosts ? hosts[0] : hErr);

    const { data: fests, error: fErr } = await hostDb.from('fests').select('*').limit(1);
    console.log("Fests:", fests ? fests[0] : fErr);
}
check();
