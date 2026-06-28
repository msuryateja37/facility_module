import { Request, Response } from 'express';
import { User } from '../models/User';
import { SystemLog } from '../models/SystemLog';

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user = await User.getByUsername(username);
    if (user && user.password === password) {
      await SystemLog.log("User Login", username, `Login success for user '${username}'`);
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json({
        success: true,
        token: `mock-jwt-token-${username}`,
        user: {
          ...userWithoutPassword,
          department: "Department of Land Reform & Rural Development (DLRRD)"
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error processing login request"
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  const { username } = req.params;
  try {
    const user = await User.getByUsername(username);
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
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error fetching user profile"
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const { username } = req.params;
  const { firstName, lastName, email, phoneNumber, officeLocation } = req.body;
  try {
    const existing = await User.getByUsername(username);
    if (!existing) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    const updated = await User.update(username, {
      firstName,
      lastName,
      email,
      phoneNumber,
      officeLocation
    });
    
    if (!updated) {
      return res.status(500).json({ success: false, message: "Failed to update profile" });
    }

    await SystemLog.log("Update Profile", username, `Updated profile details for '${username}'`);
    const { password: _, ...userWithoutPassword } = updated;
    return res.status(200).json({
      success: true,
      user: {
        ...userWithoutPassword,
        department: "Department of Land Reform & Rural Development (DLRRD)"
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error updating user profile"
    });
  }
};
