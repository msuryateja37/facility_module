"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = exports.login = void 0;
const User_1 = require("../models/User");
const SystemLog_1 = require("../models/SystemLog");
const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User_1.User.getByUsername(username);
        if (user && user.password === password) {
            await SystemLog_1.SystemLog.log("User Login", username, `Login success for user '${username}'`);
            const { password: _, ...userWithoutPassword } = user;
            return res.status(200).json({
                success: true,
                token: `mock-jwt-token-${username}`,
                user: {
                    ...userWithoutPassword,
                    department: "Department of Land Reform & Rural Development (DLRRD)"
                }
            });
        }
        else {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "Error processing login request"
        });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    const { username } = req.params;
    try {
        const user = await User_1.User.getByUsername(username);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json({
            success: true,
            user: {
                ...userWithoutPassword,
                department: "Department of Land Reform & Rural Development (DLRRD)"
            }
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "Error fetching user profile"
        });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    const { username } = req.params;
    const { firstName, lastName, email, phoneNumber, officeLocation } = req.body;
    try {
        const existing = await User_1.User.getByUsername(username);
        if (!existing) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const updated = await User_1.User.update(username, {
            firstName,
            lastName,
            email,
            phoneNumber,
            officeLocation
        });
        if (!updated) {
            return res.status(500).json({ success: false, message: "Failed to update profile" });
        }
        await SystemLog_1.SystemLog.log("Update Profile", username, `Updated profile details for '${username}'`);
        const { password: _, ...userWithoutPassword } = updated;
        return res.status(200).json({
            success: true,
            user: {
                ...userWithoutPassword,
                department: "Department of Land Reform & Rural Development (DLRRD)"
            }
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "Error updating user profile"
        });
    }
};
exports.updateProfile = updateProfile;
