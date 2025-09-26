import transporter from "../configs/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import stripe from "stripe";

// ----------------------------
// Check Room Availability
// ----------------------------
const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
  try {
    const bookings = await Booking.find({
      room,
      checkInDate: { $lte: checkOutDate },
      checkOutDate: { $gte: checkInDate },
    });

    return bookings.length === 0;
  } catch (error) {
    console.error("Error checking availability:", error.message);
    return false;
  }
};

// ----------------------------
// API: Check Room Availability
// POST /api/bookings/check-availability
// ----------------------------
export const checkAvailabilityAPI = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate } = req.body;
    const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
    res.json({ success: true, isAvailable });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ----------------------------
// API: Create Booking with Email (INR)
// POST /api/bookings/book
// ----------------------------
export const createBooking = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate, guests } = req.body;
    const user = req.user._id;

    // Check availability
    const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
    if (!isAvailable) {
      return res.json({ success: false, message: "Room is not available" });
    }

    // Get Room & Hotel details
    const roomData = await Room.findById(room).populate("hotel");
    if (!roomData) return res.json({ success: false, message: "Room not found" });

    // Calculate total price
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));
    const totalPrice = roomData.pricePerNight * nights;

    // Create booking
    const booking = await Booking.create({
      user,
      room,
      hotel: roomData.hotel._id,
      guests: +guests,
      checkInDate,
      checkOutDate,
      totalPrice,
    });

    // Send confirmation email
    const mailOptions = {
      from: `"HoYo Booking" <${process.env.SENDER_EMAIL}>`,
      to: req.user.email,
      subject: "Hotel Booking Confirmation",
      html: `
        <h2>Your Booking Details</h2>
        <p>Dear ${req.user.username},</p>
        <p>Thank you for your booking! Here are your details:</p>
        <ul>
          <li><strong>Booking ID:</strong> ${booking._id}</li>
          <li><strong>Hotel Name:</strong> ${roomData.hotel.name}</li>
          <li><strong>Location:</strong> ${roomData.hotel.address}</li>
          <li><strong>Check-in:</strong> ${booking.checkInDate.toDateString()}</li>
          <li><strong>Check-out:</strong> ${booking.checkOutDate.toDateString()}</li>
          <li><strong>Total Amount:</strong> ₹ ${booking.totalPrice}</li>
        </ul>
        <p>We look forward to welcoming you!</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Booking confirmation sent to ${req.user.email}`);
    } catch (err) {
      console.error("❌ Failed to send booking email:", err.message);
    }

    res.json({ success: true, message: "Booking created successfully", booking });
  } catch (error) {
    console.error("❌ Booking creation failed:", error.message);
    res.json({ success: false, message: "Failed to create booking" });
  }
};

// ----------------------------
// API: Get Bookings for User
// GET /api/bookings/user
// ----------------------------
export const getUserBookings = async (req, res) => {
  try {
    const user = req.user._id;
    const bookings = await Booking.find({ user }).populate("room hotel").sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
};

// ----------------------------
// API: Get Bookings for Hotel Owner
// GET /api/bookings/hotel
// ----------------------------
export const getHotelBookings = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.auth().userId });
    if (!hotel) return res.json({ success: false, message: "No Hotel found" });

    const bookings = await Booking.find({ hotel: hotel._id }).populate("room hotel user").sort({ createdAt: -1 });

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((acc, booking) => acc + booking.totalPrice, 0);

    res.json({ success: true, dashboardData: { totalBookings, totalRevenue, bookings } });
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
};

// ----------------------------
// API: Stripe Payment (INR)
// POST /api/bookings/payment
// ----------------------------
export const stripePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.json({ success: false, message: "Booking not found" });

    const roomData = await Room.findById(booking.room).populate("hotel");
    const totalPrice = booking.totalPrice;

    const { origin } = req.headers;
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    const line_items = [
      {
        price_data: {
          currency: "inr", // Indian Rupees
          product_data: { name: roomData.hotel.name },
          unit_amount: Math.round(totalPrice), // Convert INR to paise
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      metadata: { bookingId },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("❌ Stripe Payment Failed:", error.message);
    res.json({ success: false, message: "Payment Failed" });
  }
};
