const { db } = require("../config/firebase");

const DAILY_AI_LIMIT = 10;

const FEATURE_FIELDS = {
    mentor: "mentorCount",
    agent: "agentCount",
};

const getUsageDate = () => {
    const configuredTimeZone =
        process.env.AI_USAGE_TIMEZONE || "Asia/Kolkata";

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: configuredTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
};

const getUsageRef = (firebaseUid) => {
    const usageDate = getUsageDate();

    return db
        .collection("aiUsage")
        .doc(`${firebaseUid}_${usageDate}`);
};

const consumeAIUsage = async (firebaseUid, feature) => {
    if (!firebaseUid) {
        return {
            allowed: false,
            reason: "missing_uid",
            limit: DAILY_AI_LIMIT,
            used: 0,
            remaining: 0,
        };
    }

    const field = FEATURE_FIELDS[feature];

    if (!field) {
        throw new Error(
            `Unsupported AI usage feature: ${feature}`
        );
    }

    const usageRef = getUsageRef(firebaseUid);

    return db.runTransaction(async (transaction) => {
        const usageDoc = await transaction.get(usageRef);

        const currentData = usageDoc.exists
            ? usageDoc.data()
            : {};

        const used = Number(currentData[field] || 0);

        if (used >= DAILY_AI_LIMIT) {
            return {
                allowed: false,
                reason: "daily_limit_reached",
                limit: DAILY_AI_LIMIT,
                used,
                remaining: 0,
            };
        }

        const newUsed = used + 1;

        transaction.set(
            usageRef,
            {
                firebaseUid,
                date: getUsageDate(),
                [field]: newUsed,
                updatedAt: new Date().toISOString(),
            },
            { merge: true }
        );

        return {
            allowed: true,
            reason: "allowed",
            limit: DAILY_AI_LIMIT,
            used: newUsed,
            remaining: DAILY_AI_LIMIT - newUsed,
        };
    });
};

const refundAIUsage = async (firebaseUid, feature) => {
    if (!firebaseUid) {
        return;
    }

    const field = FEATURE_FIELDS[feature];

    if (!field) {
        throw new Error(
            `Unsupported AI usage feature: ${feature}`
        );
    }

    const usageRef = getUsageRef(firebaseUid);

    await db.runTransaction(async (transaction) => {
        const usageDoc = await transaction.get(usageRef);

        if (!usageDoc.exists) {
            return;
        }

        const currentData = usageDoc.data();
        const used = Number(currentData[field] || 0);

        transaction.update(usageRef, {
            [field]: Math.max(used - 1, 0),
            updatedAt: new Date().toISOString(),
        });
    });
};

const getAIUsage = async (firebaseUid) => {
    if (!firebaseUid) {
        return {
            mentor: {
                used: 0,
                limit: DAILY_AI_LIMIT,
                remaining: DAILY_AI_LIMIT,
            },
            agent: {
                used: 0,
                limit: DAILY_AI_LIMIT,
                remaining: DAILY_AI_LIMIT,
            },
        };
    }

    const usageRef = getUsageRef(firebaseUid);
    const usageDoc = await usageRef.get();

    const data = usageDoc.exists
        ? usageDoc.data()
        : {};

    const mentorUsed = Number(data.mentorCount || 0);
    const agentUsed = Number(data.agentCount || 0);

    return {
        mentor: {
            used: mentorUsed,
            limit: DAILY_AI_LIMIT,
            remaining: Math.max(
                DAILY_AI_LIMIT - mentorUsed,
                0
            ),
        },

        agent: {
            used: agentUsed,
            limit: DAILY_AI_LIMIT,
            remaining: Math.max(
                DAILY_AI_LIMIT - agentUsed,
                0
            ),
        },
    };
};

module.exports = {
    DAILY_AI_LIMIT,
    consumeAIUsage,
    refundAIUsage,
    getAIUsage,
};