// Runs once, the first time MongoDB starts with an empty data volume.
// Creates a user that can only read and write the app's own database, so the app
// never runs with root rights. Credentials come from the container's environment.
const appDb = db.getSiblingDB('shayuflow')

appDb.createUser({
  user: process.env.MONGO_APP_USER,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: 'shayuflow' }],
})
