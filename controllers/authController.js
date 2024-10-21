// controllers/authController.js
import Users from "../models/userModel.js";
import { compareString, createJWT, hashString } from "../utils/index.js";
import { sendVerificationEmail } from "../utils/sendEmail.js";

export const register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  // Valider les champs
  if (!(firstName && lastName && email && password)) {
    return res.status(400).json({ message: "Provide Required Fields!" });
  }

  try {
    const userExist = await Users.findOne({ email });

    if (userExist) {
      return res.status(400).json({ message: "Email Address already exists" });
    }

    const hashedPassword = await hashString(password);

    const user = await Users.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    // Envoyer l'e-mail de vérification à l'utilisateur
    await sendVerificationEmail(user, res);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Please Provide User Credentials" });
    }

    // Trouver l'utilisateur par email
    const user = await Users.findOne({ email })
        .select("+password")
        .populate({
          path: "friends",
          select: "firstName lastName location profileUrl -password",
        });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.verified) {
      return res.status(400).json({
        message:
            "User email is not verified. Check your email account and verify your email",
      });
    }

    // Comparer le mot de passe
    const isMatch = await compareString(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    user.password = undefined;

    const token = createJWT(user._id); // Assurez-vous que cette fonction crée un token avec { userId: ... }

    res.status(200).json({
      success: true,
      message: "Login successfully",
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
