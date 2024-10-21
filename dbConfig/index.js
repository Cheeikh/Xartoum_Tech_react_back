import mongoose from "mongoose";

const dbConnection = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("DB Connected Successfully");
  } catch (error) {
    console.error("DB Error: " + error);
    throw error; // Propager l'erreur pour qu'elle soit capturée dans index.js
  }
};

export default dbConnection;
