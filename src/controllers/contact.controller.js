import User from "../models/user.model.js";

export const getAllContactsController = async (req, res, next) => {

    const { contacts } = req.user;

    try {

        return res.status(200).json(contacts);

    } catch (error) {
        next(error)
    }

};


export const getContactController = async (req, res, next) => {

    const { email } = req.params;

    try {

        const user = await User.findOne({ email })
            .populate('contacts', '_id displayName email photoURL');

        return res.status(200).json(user)

    } catch (error) {
        next(error)
    }

};