import Call from "../models/call.model.js";
import User from "../models/user.model.js";

// export const postCall = async (req,res,next)=> {
//     try {
//         const {callee,caller,type,call_status,duration} = req.body;

//         if(!callee || !caller) {
//             return res.status(401).json({message: 'callee and caller are requred'})
//         }
//         const call = await Call.create({callee,caller,type,call_status,duration});

//         await User.updateMany({_id: {$in: [callee,caller]}},{$push:{calls: call._id}});

//         return res.status(200).json({call});

//     }
//     catch (error) {
//         next(error)
//     }
// };

// export const updateCall =  async (req,res,next)=> {
//     try {
//         const {call_id,call_status,duration} = req.body;

//         if(!call_id || !call_status) {
//             return res.status(401).json({message:'call id and call status aer required'})
//         };

//         const call = await Call.findByIdAndUpdate(call_id,{call_status,duration});

//         return res.status(200).json({call});
//     }
//     catch (error) {
//         next(error)
//     }
// };

export const getCalls = async (req, res, next) => {
    try {
        const { _id } = req.user;

        if (!_id) {
            return res.status(401).json({ message: 'user id is required' })
        };

        const calls = await Call.find({ $or: [{ callee: _id }, { caller: _id }] })
            .populate('callee', 'name photoURL _id')
            .populate('caller', 'name photoURL _id')
            .sort({ createdAt: -1 });

        return res.status(200).json(calls);
    }
    catch (error) {
        next(error)
    }
};