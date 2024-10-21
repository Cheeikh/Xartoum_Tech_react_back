import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const hashString = async (useValue) => {
  const salt = await bcrypt.genSalt(10);

  const hashedpassword = await bcrypt.hash(useValue, salt);
  return hashedpassword;
};

export const compareString = async (userPassword, password) => {
  const isMatch = await bcrypt.compare(userPassword, password);
  return isMatch;
};

//JSON WEBTOKEN
export const createJWT = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "30d", // Par exemple, 30 jours
  });
}
