import Channel from "../models/channel.model.js";
// import { upload_file } from "../utils/upload_file.js";


export const getAllChannels = async (req, res, next) => {

    const { _id } = req.user;

    try {
        const channels = await Channel.find({ onwer: { $in: _id }, followers: { $in: _id } });
        return res.status(200).json(channels)
    }
    catch (error) {
        next(error)
    };

};

export const getChannelDetails = async (req, res, next) => {
    const { channelId } = req.params;
    const { limit = 20, page = 1 } = req.params;
    try {
        const channel = await Channel.findById(channelId)
            .populate({
                path: 'messages',
                limit,
                skip: limit * (page - 1)
            })
        return res.status(200).json(channel)
    }
    catch (error) {
        next(error)
    }
}