import crypto from 'crypto';


class OTPServices {

    static generateOTP = (length = 6) : string => {
        return crypto.randomInt(Math.pow(10, length - 1), Math.pow(10, length)).toString();
    };

    static generateOTPExpiration = (expirationMinutes = 1) : Date => {
        return new Date(Date.now() + expirationMinutes * 60 * 1000);
    };
}

export default OTPServices;