// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import Users from '../models/userModel.js';

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
console.log(jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET_KEY));
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      req.user = await Users.findById(decoded.id)
      if (!req.user) {
        return res.status(401).json({ message: "Utilisateur non trouvé" });
      }
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Token invalide" });
    }
  } else {
    return res.status(401).json({ message: "Autorisation requise" });
  }
};

export default verifyToken;
