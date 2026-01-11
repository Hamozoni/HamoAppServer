import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase_admin.js';
import User from '../models/user.model.js';
import mongoose, { FilterQuery, Document } from 'mongoose';

type DecodedIdToken = admin.auth.DecodedIdToken;

interface IUser {
    displayName: string;
    email: string;
    bio: string;
    emailVerified: boolean;
    photoURL: string;
    photoPoblicId?: string;
    lastLoginAt: Date;
    firebaseUid?: string;
    phoneNumber?: string;
    contacts: mongoose.Types.ObjectId[];
    blockedContacts: mongoose.Types.ObjectId[];
    devices: string[];
}

interface UserDocument extends Document {
    displayName: string;
    email: string;
    bio: string;
    emailVerified: boolean;
    photoURL: string;
    photoPoblicId?: string;
    lastLoginAt: Date;
    firebaseUid?: string;
    phoneNumber?: string;
    contacts: mongoose.Types.ObjectId[];
    blockedContacts: mongoose.Types.ObjectId[];
    devices: string[];
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    save(): Promise<this>;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserDocument;
        }
    }
}

const authMiddleware = async (
    req: Request, 
    res: Response,
    next: NextFunction  
) : Promise<Response | void> => {

    try {
        const authHeader : string | undefined = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'unauthorized' })
        };

        const idToken : string = authHeader.split('Bearer ')[1];
        const decodedToken : DecodedIdToken = await admin.auth().verifyIdToken(idToken);

        if (!decodedToken.email) {
            return res.status(401).json({ message: 'email not found in token' });
        }

        let user = await User.findOne({ firebaseUid: decodedToken.uid } as FilterQuery<IUser>)
            .populate({
                path: 'contacts',
                select: '_id firebaseUid displyName photoURL bio'
            })
            .populate({
                path: 'blockedContacts',
                select: '_id firebaseUid displyName photoURL bio'
            }) as unknown as UserDocument | null;

        if (!user) {
            const newUser = await User.create({
                displayName: decodedToken.name || decodedToken.email.split('@')[0],
                email: decodedToken.email,
                bio: decodedToken?.bio || 'Hey there! I am using WhatsApp.',
                emailVerified: decodedToken.email_verified || false,
                photoURL: decodedToken?.picture || './placeholder_avatar.jpg',
                photoPoblicId: decodedToken?.photoURLId || null,
                firebaseUid: decodedToken.uid,
                phoneNumber: decodedToken.phone_number || '',
                lastLoginAt: new Date()
            });
            
            user = newUser as unknown as UserDocument;
        } else {
            user.lastLoginAt = new Date();
            await (user as any).save();
        }

        req.user = user;


        next();

    }
    catch (error: any) {
        console.log(error?.message || 'Authentication error');
        return res.status(401).json({ message: 'invalid token' });
    }
};


export default authMiddleware;