const admin = require("firebase-admin");

// Note: You need to download your service account key from Firebase Console
// Project Settings > Service Accounts > Generate new private key
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const volunteers = [
  { name: "John Doe", skill: "Medical", status: "available", location: "Downtown" },
  { name: "Jane Smith", skill: "Plumbing", status: "available", location: "West Side" },
  { name: "Bob Wilson", skill: "Construction", status: "available", location: "East Side" },
  { name: "Alice Green", skill: "Cleaning", status: "available", location: "South Side" },
  { name: "Charlie Brown", skill: "Electrician", status: "available", location: "North Side" }
];

async function seed() {
  const batch = db.batch();
  
  volunteers.forEach(v => {
    const ref = db.collection("volunteers").doc();
    batch.set(ref, v);
  });

  await batch.commit();
  console.log("Volunteers seeded successfully!");
  process.exit();
}

seed();
