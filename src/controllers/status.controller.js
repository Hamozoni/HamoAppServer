
import Status from '../models/status.model.js';

export const getAllStatus = async (req,res,next)=> {

    const {_id,contacts} = req.user;
    try  {
        const status = await Status.find({onwer:{$in: [...contacts,_id]}})
        return res.status(200).json(status)
    }
    catch (error) {
        next(error);
    }
}