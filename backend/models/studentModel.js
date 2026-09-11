const { db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

// Create a new student
const createStudent = async (studentData) => {
    const docRef = await db.collection("students").add(studentData);

    return {
        id: docRef.id,
        ...studentData,
    };
};

// Get all students
const getAllStudents = async () => {
    const snapshot = await db.collection("students").get();

    const students = [];

    snapshot.forEach((doc) => {
        students.push({
            id: doc.id,
            ...doc.data(),
        });
    });

    return students;
};

// Get one student by ID
const getStudentById = async (studentId) => {
    const doc = await db
        .collection("students")
        .doc(studentId)
        .get();

    if (!doc.exists) {
        return null;
    }

    return {
        id: doc.id,
        ...doc.data(),
    };
};

// Get student by Firebase UID
const getStudentByFirebaseUid = async (firebaseUid) => {
    const snapshot = await db
        .collection("students")
        .where("firebaseUid", "==", firebaseUid)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];

    return {
        id: doc.id,
        ...doc.data(),
    };
};

// Add a skill to a student
const addSkill = async (studentId, skill) => {
    const docRef = db.collection("students").doc(studentId);

    const doc = await docRef.get();

    if (!doc.exists) {
        return null;
    }

    await docRef.update({
        skills: FieldValue.arrayUnion(skill),
    });

    const updatedDoc = await docRef.get();

    return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
    };
};

// Mark a module as completed
const addCompletedModule = async (studentId, moduleName) => {
    const docRef = db.collection("students").doc(studentId);

    const doc = await docRef.get();

    if (!doc.exists) {
        return null;
    }

    await docRef.update({
        completedModules: FieldValue.arrayUnion(moduleName),
    });

    const updatedDoc = await docRef.get();

    return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
    };
};

module.exports = {
    createStudent,
    getAllStudents,
    getStudentById,
    getStudentByFirebaseUid,
    addSkill,
    addCompletedModule,
};