const validationSchema = require('../application/validations/index');
const validate = require('express-validation');
const middleware = require('../middlewares/authentication');
const errorHandler = require('../middlewares/error-handler');
const setEndpoint = require('../helpers/utilities/set-endpoint');
const {
    merge,
} = require('lodash');

module.exports = function ({ controllers, views }) {
    views = { json: views.jsonView };

    const apis = {
        // -------- Authentication && Registration API ------------------------------

        '/api/v1/register': [{
            method: 'POST',
            action: controllers.registrationController.registerUser,
            middleware: [
                middleware.auth('anonymous'),
                validate(validationSchema.authentication.registerUser),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/verify-email/:token': [{
            method: 'GET',
            action: controllers.authenticationController.verifyEmail,
            middleware: [
                middleware.auth('anonymous'),
                validate(validationSchema.authentication.verifyEmail),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/check-email': [{
            method: 'POST',
            action: controllers.userController.checkEmail,
            middleware: [
                middleware.auth('anonymous'),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/login': [{
            method: 'POST',
            action: controllers.authenticationController.login,
            middleware: [
                middleware.auth('anonymous'),
                validate(validationSchema.authentication.login),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/logout': [{
            method: 'GET',
            action: controllers.authenticationController.logout,
            middleware: [
                middleware.auth('authenticated'),
            ],
            views,
        }],

        '/api/v1/forgot-password': [{
            method: 'POST',
            action: controllers.authenticationController.forgotPassword,
            middleware: [
                middleware.auth('anonymous'),
                validate(validationSchema.authentication.forgotPassword),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/reset-password': [{
            method: 'PUT',
            action: controllers.authenticationController.resetPassword,
            middleware: [
                middleware.auth('anonymous'),
                validate(validationSchema.authentication.resetPassword),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/activate-user-account/:token': [{
            method: 'POST',
            action: controllers.authenticationController.activateUserAccount,
            middleware: [
                middleware.auth('anonymous'),
            ],
            views,
        }],

        '/api/v1/social-login/:token': [{
            method: 'POST',
            action: controllers.authenticationController.socialLogin,
            middleware: [
                middleware.auth('anonymous'),
            ],
            views,
        }],

        '/api/v1/validate-token': [{
            method: 'GET',
            action: controllers.authenticationController.validateToken,
            middleware: [
                middleware.auth('authenticated'),
            ],
            views,
        }],

        // ----------------- User API --------------------------------------

        '/api/v1/user/change-password': [{
            method: 'PATCH',
            action: controllers.userController.changePassword,
            middleware: [
                middleware.auth('authenticated'),
                validate(validationSchema.user.changePassword),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/user/change-email': [{
            method: 'PATCH',
            action: controllers.userController.changeEmail,
            middleware: [
                middleware.auth('authenticated'),
                validate(validationSchema.user.changeEmail),
                errorHandler,
            ],
            views,
        }],

        // ----------------------Candidate Profile API----------------------------

        '/api/v1/candidate-profile/mask': [{
            method: 'GET',
            action: controllers.candidateProfileController.maskProfile,
            middleware: [
                middleware.auth('generic'),
            ],
            views,
        }],

        // ----------------------Social Login API---------------------------------

        '/api/v1/auth/linkedin': [{
            method: 'GET',
            action: passport.authenticate('linkedin', {
                scope: ['r_emailaddress', 'r_basicprofile'],
            }),
            middleware: [middleware.auth('anonymous')],
            views,
        }],

        '/api/v1/auth/linkedin/callback': [{
            method: 'GET',
            action: controllers.registrationController.linkedInLogin,
            middleware: [
                passport.authenticate('linkedin', {
                    failureRedirect: `${process.env.FRONTEND_HOST}/login`,
                }),
            ],
            views,
        }],

        // ----------------------NEM API's---------------------------------

        '/api/v1/wallet/getBalance': [{
            method: 'GET',
            action: controllers.walletController.checkBalance,
            middleware: [
                middleware.auth('authenticated'),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/wallet/mosaicBalance': [{
            method: 'GET',
            action: controllers.walletController.mosaicBalance,
            middleware: [
                middleware.auth('authenticated'),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/wallet/tokenTransfer': [{
            method: 'POST',
            action: controllers.walletController.tokenTransfer,
            middleware: [
                middleware.auth('authenticated'),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/wallet/createWallet': [{
            method: 'POST',
            action: controllers.walletController.createWallet,
            middleware: [
                middleware.auth('authenticated'),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/wallet/decryptWallet': [{
            method: 'POST',
            action: controllers.walletController.decryptWallet,
            middleware: [
                middleware.auth('authenticated'),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/wallet/linkWallet': [{
            method: 'POST',
            action: controllers.walletController.linkWallet,
            middleware: [
                middleware.auth('authenticated'),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/wallet/mosaicTransfer': [{
            method: 'POST',
            action: controllers.walletController.mosaicTransfer,
            middleware: [
                middleware.auth('authenticated'),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/wallet/mosaicXemTransfer': [{
            method: 'POST',
            action: controllers.walletController.mosaicXemTransfer,
            middleware: [
                middleware.auth('authenticated'),
                errorHandler,
            ],
            views,
        }],

        '/api/v1/wallet/transferPleoToOtherWallet': [{
            method: 'POST',
            action: controllers.walletController.transferPleoToOtherWallet,
            middleware: [
                middleware.auth('authenticated'),
                errorHandler,
            ],
            views,
        }],

    };

    const logApis = setEndpoint('log', 'LogController', 'authenticated', app);
    const tokenApis = setEndpoint('token', 'TokenController', 'anonymous', app);
    const userApis = setEndpoint('user', 'UserController', 'authenticated', app);
    const educationApis = setEndpoint('education', 'EducationController', 'authenticated', app);
    const workExperienceApis = setEndpoint('work-experience', 'WorkExperienceController', 'authenticated', app);
    const candidateProfileApis = setEndpoint('candidate-profile', 'CandidateProfileController', 'authenticated', app);
    const skillApis = setEndpoint('skill', 'SkillController', 'authenticated', app);
    const profileContactApis = setEndpoint('profile-contact', 'ProfileContactController', 'authenticated', app);
    const employerProfileApis = setEndpoint('employer-profile', 'Employer/EmployerProfileController', 'authenticated', app);

    return merge(
        apis,
        logApis,
        tokenApis,
        userApis,
        educationApis,
        workExperienceApis,
        candidateProfileApis,
        skillApis,
        profileContactApis,
        employerProfileApis,
    );
};
