const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

let serviceAccount;

// Use environment variable when deployed
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
    );
} else {
    // Use local service-account file during development
    serviceAccount = require("./firebase-service-account.json");
}

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

module.exports = { db };