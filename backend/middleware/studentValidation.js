const validateStudent = (req, res, next) => {
    const {
        name,
        email,
        college,
        branch,
        year,
    } = req.body;

    // Check required fields
    if (!name || !email || !college || !branch || !year) {
        return res.status(400).json({
            success: false,
            message: "Name, email, college, branch and year are required",
        });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Please provide a valid email address",
        });
    }

    // Validate year
    if (!Number.isInteger(Number(year)) || Number(year) < 1 || Number(year) > 4) {
        return res.status(400).json({
            success: false,
            message: "Year must be a number between 1 and 4",
        });
    }

    next();
};

module.exports = validateStudent;