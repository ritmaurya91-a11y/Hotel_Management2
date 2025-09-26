import User from "../models/User.js";
import Room from "../models/Room.js" // or Hotel.js if you have it
import Booking from "../models/Booking.js";
import { clerkClient } from "@clerk/clerk-sdk-node";
import Hotel from "../models/Hotel.js";

export const getUserData = async (req, res) => {
  try {
    const role = req.user.role;
    const recentSearchedCities = req.user.recentSearchedCities;
    res.json({ success: true, role, recentSearchedCities });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Store User Recent Searched Cities
// POST /api/user/recent-searched-cities
export const storeRecentSearchedCities = async (req, res) => {
  try {
    const { recentSearchedCity } = req.body;
    const user = await req.user;
    // Store max 3 recent searched cities
    if (user.recentSearchedCities.length < 3) {
      user.recentSearchedCities.push(recentSearchedCity);
    } else {
      user.recentSearchedCities.shift();
      user.recentSearchedCities.push(recentSearchedCity);
    }
    await user.save();
    res.json({ success: true, message: "City added" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const hotels = await Hotel.find({ owner: userId });

    const hotelIds = hotels.map(hotel => hotel._id);

    // 2. Delete all rooms associated with these hotels
    await Room.deleteMany({ hotel: { $in: hotelIds } });

    // 3. Delete all hotels owned by this user
    await Hotel.deleteMany({ owner: userId });

    // 4. Delete all bookings made by this user (if applicable)
    await Booking.deleteMany({ user: userId });

    // 3. Delete user from MongoDB
    await User.findByIdAndDelete(userId);

    // 4. Delete user from Clerk (optional but recommended)
    await clerkClient.users.deleteUser(userId);

    res.json({ success: true, message: "Account and all associated data deleted." });

  } catch (error) {
    console.error("Delete Account Error:", error);
    res.status(500).json({ success: false, message: "Server error while deleting account" });
  }
};