// Supposons que ceci est dans un fichier comme creditController.js
import Users from '../models/userModel.js';

export const getUserCredits = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.status(200).json({ credits: user.dailyPostCredits });
  } catch (error) {
    console.error("Erreur lors de la récupération des crédits:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

export const purchaseCredits = async (req, res) => {
  try {
    const { userId, creditAmount } = req.body;
    
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    await user.addPurchasedCredits(creditAmount);
    
    const updatedUser = await Users.findById(userId);
    
    res.status(200).json({ 
      message: "Crédits ajoutés avec succès", 
      newCreditBalance: updatedUser.dailyPostCredits 
    });
  } catch (error) {
    console.error("Erreur lors de l'achat de crédits:", error);
    res.status(500).json({ message: "Erreur lors de l'achat de crédits", error: error.message });
  }
};
