// import User from "../models/User.js";
// // Middleware to check if user is authenticated
// export const protect = async (req, res, next) => {
//   const { userId } = req.auth();
//   console.log(userId)
//   if (!userId) {
//     res.json({ success: false, message: "not authenticated" });
//   } else {
//     const user = await User.findById(userId);
//     console.log(user)
//     req.user = user;
//     next();
//   }
// };

import { clerkClient } from "@clerk/clerk-sdk-node";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const { userId } = req.auth(); // Clerk user ID

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    // Try to find user in MongoDB by Clerk ID
    // let user = await User.findOne({ clerkId: userId });
    let user = await User.findById(userId);
    // console.log(user)

    // If user doesn't exist, fetch from Clerk and create in MongoDB
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);

      user = await User.create({
        _id: userId,
        clerkId: userId, 
        username: clerkUser.username || `${clerkUser.firstName}_${clerkUser.lastName}`,
        email: clerkUser.emailAddresses[0].emailAddress,
        image: clerkUser.imageUrl,
        role: "user", // or assign based on condition
        recentSearchedCities: [], // initialize empty
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error("Error in protect middleware:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


