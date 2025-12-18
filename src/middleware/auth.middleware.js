import admin from '../config/firebase_admin.js';
import User from '../models/user.model.js';

const authMiddleware = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'unauthorized' })
        };

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        console.log(decodedToken)

        let user = await User.findOne({ firebaseUid: decodedToken?.uid })
            .populate({
                path: 'contacts',
                select: '_id firebaseUid displyName photoURL bio'
            })
            .populate({
                path: 'blockedContacts',
                select: '_id firebaseUid displyName photoURL bio'
            })

        if (!user) {
            user = await User.create({
                displayName: decodedToken.name || decodedToken.email.split('@')[0],
                email: decodedToken.email,
                bio: decodedToken?.bio || 'Hey there! I am using WhatsApp.',
                emailVerified: decodedToken.email_verified,
                photoURL: decodedToken?.picture,
                photoURLId: decodedToken?.photoURLId || null,
                firebaseUid: decodedToken.uid,
                lastLoginAt: Date.now()
            });
        } else {
            user.lastLoginAt = Date.now();
            await user.save()
        };

        req.user = user;


        next();

    }
    catch (error) {
        console.log(error.message)
        return res.status(401).json({ message: 'invalid token' });
    }
};


export default authMiddleware;