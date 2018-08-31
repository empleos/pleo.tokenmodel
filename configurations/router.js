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
    };

    return merge(
        apis,
    );
};